#!/usr/bin/env node
// ====== 京东脉搏 · 每日新闻自动更新脚本 ======
// 运行环境：GitHub Actions (ubuntu, Node 20) 或本地 Node 18+
// 行为：抓取京东相关新闻 → 过滤最近3天 → 更新 data.js 的
//       NEWS_DATA / TICKER_ITEMS / TIMELINE_DATA 和头部时间戳
// 数据源（多源容错，任一成功即可）：
//   1. 东方财富搜索 API（UTF-8 JSONP，无需鉴权）
//   2. Bing News RSS（海外服务器可用）
//   3. Google News RSS（海外服务器可用）
// 安全约定（血泪教训）：
//   1. 字符串内容里的 ASCII 双引号一律替换为中文引号，防止截断 JS 语法
//   2. 写回前必须 node --check 校验（workflow 负责）
//   3. 只动 data.js，不动 index.html

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_FILE = path.join(ROOT, 'data.js');

const QUERIES = ['京东', '京东物流', '京东健康', '京东外卖', '京东工业'];
const DAYS_BACK = 3;        // 只看最近 3 天
const MAX_NEWS = 15;        // NEWS_DATA 总条数上限
const MAX_TICKER = 12;      // TICKER_ITEMS 条数
const MAX_TIMELINE = 17;    // TIMELINE_DATA 条数上限

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// 标题关键词 → 分类
const TAG_RULES = [
  [/财报|业绩|营收|净利|利润|派息|中期|季度|年报/, 'finance', '财报'],
  [/物流|配送|快递|仓储|运输|无人车|地铁|供应链|快递员/, 'logistics', '物流'],
  [/AI|人工智能|智能|机器人|芯片|大模型|科技|技术|自动驾驶/, 'tech', '技术'],
  [/股价|港股|美股|市值|评级|目标价/, 'market', '市场'],
];
const TAG_CLASS = {
  finance: 'tag-finance',
  logistics: 'tag-logistics',
  tech: 'tag-tech',
  market: 'tag-market',
  business: 'tag-business',
};
const TAG_EMOJI = {
  finance: '📊',
  logistics: '🚚',
  tech: '🤖',
  market: '📈',
  business: '📢',
};

function classify(title) {
  for (const [re, tag, label] of TAG_RULES) {
    if (re.test(title)) return { tag, label };
  }
  return { tag: 'business', label: '业务动态' };
}

// ---- 上海时区工具 ----
function shanghaiNow() {
  return new Date();
}
function toShanghaiDateStr(d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function toShanghaiDateTimeStr(d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

// ---- 文本工具 ----
// 注意：<em> 等内联高亮标签必须直接删除（不能替换成空格），否则「王<em>东</em>升」会变成「王 东 升」
function stripHtml(s) {
  return String(s || '')
    .replace(/<br\s*\/?>|<\/?p[^>]*>|<\/?div[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
function normalizeTitle(t) {
  return String(t || '')
    .replace(/\s+/g, '')
    .replace(/[，。！？、,.:;!?'"“”‘’\-—|·《》]/g, '')
    .toLowerCase();
}

// ---- 数据源 1：东方财富搜索 API（UTF-8 JSONP）----
async function fetchEastmoney() {
  const out = [];
  for (const q of QUERIES) {
    const param = {
      uid: '',
      keyword: q,
      type: ['cmsArticleWebOld'],
      client: 'web',
      clientType: 'web',
      clientVersion: 'curr',
      param: {
        cmsArticleWebOld: {
          searchScope: 'default',
          sort: 'time',
          pageIndex: 1,
          pageSize: 15,
          preTag: '<em>',
          postTag: '</em>',
        },
      },
    };
    const url =
      'https://search-api-web.eastmoney.com/search/jsonp?cb=cb&param=' +
      encodeURIComponent(JSON.stringify(param));
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: '*/*' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      let text;
      try {
        text = new TextDecoder('utf-8').decode(buf);
      } catch {
        text = new TextDecoder('gbk').decode(buf);
      }
      const json = text.replace(/^cb\(/, '').replace(/\)\s*;?\s*$/, '');
      const data = JSON.parse(json);
      const items = (data.result && data.result.cmsArticleWebOld) || [];
      for (const it of items) {
        const title = stripHtml(it.title || '');
        if (!title) continue;
        out.push({
          title,
          desc: stripHtml(it.content || ''),
          date: String(it.date || '').slice(0, 10),
          source: it.mediaName || '东方财富',
          link: it.url || '',
        });
      }
    } catch (e) {
      console.warn(`[warn] 东方财富抓取失败 (${q}): ${e.message}`);
    }
  }
  return out;
}

// ---- AI 摘要（DeepSeek，可选）----
// 通过环境变量 DEEPSEEK_API_KEY 启用；未配置时回退为原文摘要，任务仍可运行
async function aiSummarize(items) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key || items.length === 0) return items;
  try {
    const prompt =
      '你是一名财经新闻编辑。请为下面每条京东相关新闻生成客观、简洁的中文摘要（60~120字）：直接概括核心事实（谁、什么事、关键数据/影响），不要评价、不要开头语、不要输出任何多余内容。' +
      '严格按输入顺序输出 JSON 数组，每项是一个摘要字符串：["摘要1", "摘要2", ...]\n\n' +
      items
        .map(
          (it, i) =>
            `${i + 1}. [${it.date}] ${it.title}\n原文：${(it.desc || '').slice(0, 220)}`
        )
        .join('\n\n');
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2500,
      }),
      timeout: 90000,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const content = (data.choices && data.choices[0] && data.choices[0].message.content) || '';
    const m = content.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(m ? m[0] : content);
    const arr = Array.isArray(parsed) ? parsed : parsed.summaries;
    if (Array.isArray(arr)) {
      items.forEach((it, i) => {
        const s = arr[i];
        if (typeof s === 'string' && s.trim().length >= 20) it.summary = s.trim();
      });
    }
  } catch (e) {
    console.warn(`[warn] AI 摘要失败，使用原文摘要：${e.message}`);
  }
  return items;
}

// ---- 数据源 2/3：RSS（Bing / Google News）----
async function fetchRss(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text.includes('<item>') && !text.includes('<entry>')) {
    throw new Error('不是有效 RSS');
  }
  return text;
}

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1] || m[2];
    const grab = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return mm ? mm[1].trim() : '';
    };
    const title = stripHtml(grab('title'));
    const desc = stripHtml(grab('description') || grab('summary'));
    const pubDate = grab('pubDate') || grab('published');
    const source = stripHtml((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '');
    if (title && pubDate) {
      items.push({ title, desc, pubDate, link: '', source });
    }
  }
  return items;
}

async function fetchRssSources() {
  const out = [];
  // Bing News RSS
  for (const q of QUERIES) {
    try {
      const xml = await fetchRss(
        `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=zh-hans&cc=CN`
      );
      out.push(...parseRssItems(xml));
    } catch (e) {
      console.warn(`[warn] Bing 抓取失败 (${q}): ${e.message}`);
    }
  }
  // Google News RSS
  for (const q of QUERIES) {
    try {
      const xml = await fetchRss(
        `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`
      );
      const items = parseRssItems(xml).map((it) => {
        const mm = it.title.match(/^(.*?)\s*-\s*([^-]+)$/);
        return { ...it, title: mm ? mm[1] : it.title, source: mm ? mm[2] : it.source };
      });
      out.push(...items);
    } catch (e) {
      console.warn(`[warn] Google News 抓取失败 (${q}): ${e.message}`);
    }
  }
  return out;
}

// ---- 主流程 ----
async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`找不到 ${DATA_FILE}`);
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');

  // 1. 解析现有数组（用于合并去重；文件损坏则中止，绝不写坏文件）
  const extract = (name) => {
    const m = raw.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`));
    if (!m) throw new Error(`无法定位 const ${name} = [...]`);
    return Function(`"use strict"; return (${m[1]});`)();
  };
  const oldNews = extract('NEWS_DATA');
  const oldTimeline = extract('TIMELINE_DATA');

  // 2. 抓新闻（多源，容错）
  const now = shanghaiNow();
  const today = toShanghaiDateStr(now);
  const cutoff = new Date(now.getTime() - DAYS_BACK * 86400000);
  const cutoffStr = toShanghaiDateStr(cutoff);

  const [emItems, rssItems] = await Promise.all([fetchEastmoney(), fetchRssSources()]);
  console.log(`东方财富抓到 ${emItems.length} 条，RSS 源抓到 ${rssItems.length} 条`);

  const allItems = emItems.concat(rssItems);
  if (allItems.length === 0) {
    throw new Error('所有新闻源均抓取失败');
  }

  const seen = new Set();
  let fresh = [];
  for (const it of allItems) {
    const d = new Date(it.date);
    if (isNaN(d.getTime())) continue;
    const dstr = toShanghaiDateStr(d);
    if (dstr < cutoffStr || dstr > today) continue; // 最近3天，且不晚于今天
    const title = it.title.replace(/\s*[-–—]\s*[^-–—]+$/, '').trim(); // 去掉尾部来源
    // 标题必须包含京东相关词（去掉空格后判断），避免只在小字里提到京东的无关新闻混入
    const titleKey = normalizeTitle(title);
    // 排除「京东方」(BOE)——它是另一家公司，不是京东
    if (titleKey.includes('京东方')) continue;
    const JD_WORDS = ['京东', 'jd.com', '京东京造', '京东物流', '京东健康', '京东外卖', '京东工业', 'joybuy'];
    const isJdTitle = JD_WORDS.some((w) => titleKey.includes(w));
    if (!isJdTitle) continue;
    const key = normalizeTitle(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    fresh.push({
      title,
      desc: it.desc,
      date: dstr,
      source: it.source || '网络',
      link: it.link,
    });
  }
  fresh.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 标题相似度去重（同一事件的不同媒体报道，bigram Jaccard > 0.55 视为重复）
  function bigrams(s) {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  }
  const dedup = [];
  for (const f of fresh) {
    const fk = normalizeTitle(f.title);
    const fB = bigrams(fk);
    let dup = false;
    for (const d of dedup) {
      const dB = bigrams(normalizeTitle(d.title));
      let inter = 0;
      for (const g of fB) if (dB.has(g)) inter++;
      const jaccard = inter / (fB.size + dB.size - inter || 1);
      if (jaccard > 0.5) {
        dup = true;
        break;
      }
    }
    if (!dup) dedup.push(f);
  }
  fresh = dedup;

  console.log(`今天：${today}，过滤后最近 ${DAYS_BACK} 天内京东相关新闻 ${fresh.length} 条`);

  // 3. AI 摘要（仅对新条目；失败自动回退原文）
  fresh = await aiSummarize(fresh);

  // 4. 合并（新条目在前，旧条目去重后补足，按日期降序）
  const oldKeys = new Set(oldNews.map((n) => normalizeTitle(n.title)));
  const merged = [];
  for (const f of fresh) {
    if (oldKeys.has(normalizeTitle(f.title))) continue;
    const { tag, label } = classify(f.title);
    const base = (f.summary || f.desc || f.title).trim();
    merged.push({
      id: 0,
      tag,
      tagLabel: label,
      tagClass: TAG_CLASS[tag],
      date: f.date,
      source: f.source,
      title: f.title,
      summary: base.length > 140 ? base.slice(0, 140) + '……' : base || f.title,
    });
  }
  const rest = oldNews.filter(
    (n) => !merged.some((f) => normalizeTitle(f.title) === normalizeTitle(n.title))
  );
  // 合并后统一按日期降序（最新在前），再截取上限
  const news = merged
    .concat(rest)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_NEWS);
  news.forEach((n, i) => (n.id = i + 1));

  // 5. 重建 TICKER_ITEMS（滚动快讯：新条目替换最旧的）
  const ticker = news.slice(0, MAX_TICKER).map((n) => {
    const emoji = TAG_EMOJI[n.tag] || '📢';
    const ends = /[！!。]$/.test(n.title);
    return `${emoji} ${n.title}${ends ? '' : '！'}`;
  });

  // 6. 重建 TIMELINE_DATA（新条目插到最前）
  const tlKeys = new Set(oldTimeline.map((t) => normalizeTitle(t.title)));
  const tlNew = merged
    .map((n) => ({
      date: `${today.slice(0, 4)}年${parseInt(today.slice(5, 7), 10)}月`,
      title: n.title,
      desc: n.summary.length > 60 ? n.summary.slice(0, 60) + '……' : n.summary,
      source: n.source,
    }))
    .filter((t) => !tlKeys.has(normalizeTitle(t.title)));
  const timeline = tlNew.concat(oldTimeline).slice(0, MAX_TIMELINE);

  // 7. 序列化（内容中的 ASCII 双引号 → 中文引号，防止截断）
  const sanitize = (s) => String(s).replace(/"/g, '“');
  const jsStr = (s) => JSON.stringify(sanitize(s));
  const newsJs = news
    .map(
      (n) =>
        `  {\n` +
        `    id: ${n.id},\n` +
        `    tag: ${jsStr(n.tag)},\n` +
        `    tagLabel: ${jsStr(n.tagLabel)},\n` +
        `    tagClass: ${jsStr(n.tagClass)},\n` +
        `    date: ${jsStr(n.date)},\n` +
        `    source: ${jsStr(n.source)},\n` +
        `    title: ${jsStr(n.title)},\n` +
        `    summary: ${jsStr(n.summary)}\n` +
        `  }`
    )
    .join(',\n');
  const timelineJs = timeline
    .map(
      (t) =>
        `  {\n` +
        `    date: ${jsStr(t.date)},\n` +
        `    title: ${jsStr(t.title)},\n` +
        `    desc: ${jsStr(t.desc)},\n` +
        `    source: ${jsStr(t.source)}\n` +
        `  }`
    )
    .join(',\n');
  const tickerJs = ticker.map((t) => `  ${jsStr(t)}`).join(',\n');

  const nowStr = toShanghaiDateTimeStr(now);
  const out = raw
    .replace(/^\/\/ 最后更新：[^\n]*/m, `// 最后更新：${nowStr} (Asia/Shanghai)`)
    .replace(/const NEWS_DATA = \[[\s\S]*?\];/, `const NEWS_DATA = [\n${newsJs}\n];`)
    .replace(/const TIMELINE_DATA = \[[\s\S]*?\];/, `const TIMELINE_DATA = [\n${timelineJs}\n];`)
    .replace(/const TICKER_ITEMS = \[[\s\S]*?\];/, `const TICKER_ITEMS = [\n${tickerJs}\n];`);

  if (out === raw) {
    console.log('无内容变化，跳过写回');
    return;
  }
  fs.writeFileSync(DATA_FILE, out, 'utf8');
  console.log(`✅ data.js 已更新：新增 ${merged.length} 条，当前共 ${news.length} 条`);
}

main().catch((e) => {
  console.error(`❌ 更新失败：${e.message}`);
  process.exit(1);
});
