// ====== 京东脉搏 · 新闻数据中心 ======
// 每天 9:00 由 cron 自动更新。手动编辑也可立即生效。
// 数据源：财联社 / 东方财富 / 同花顺 / Wind金融终端 / 36氪 / 京东官方

const NEWS_DATA = [
  {
    id: 1,
    tag: "finance",
    tagLabel: "财报",
    tagClass: "tag-finance",
    date: "2026-07-28",
    source: "东方财富",
    title: "京东集团2026年Q2财报前瞻：机构预计营收超3100亿，即时零售成新增长极",
    summary: "多家券商发布京东集团Q2业绩前瞻，预计单季营收有望突破3100亿元，同比增长约7%。即时零售和京东物流外部客户收入被普遍看好，目标价获多家机构上调。"
  },
  {
    id: 2,
    tag: "market",
    tagLabel: "市场",
    tagClass: "tag-market",
    date: "2026-07-27",
    source: "财联社",
    title: "京东产发REIT挂牌以来涨超15%，物流地产资产重估潮将至",
    summary: "京东产发基础设施REIT自6月在港交所挂牌以来累计涨幅超15%，总市值突破280亿港元。分析人士认为京东物流地产资产价值有望进一步释放，或推动集团整体估值重塑。"
  },
  {
    id: 3,
    tag: "logistics",
    tagLabel: "物流",
    tagClass: "tag-logistics",
    date: "2026-07-26",
    source: "同花顺",
    title: "京东物流海外仓突破100个：跨境「3日达」覆盖欧美东南亚，供应链出海加速",
    summary: "京东物流宣布海外仓数量正式突破100大关，覆盖全球40余个国家和地区。跨境物流时效提升至最快3日达。上半年外部客户收入占比已超过72%，较去年同期提升5个百分点。"
  },
  {
    id: 4,
    tag: "tech",
    tagLabel: "技术",
    tagClass: "tag-tech",
    date: "2026-07-25",
    source: "36氪",
    title: "京东云言犀3.0发布：大模型驱动全链路AI电商，服务商家超80万",
    summary: "京东云发布言犀大模型应用平台3.0，覆盖智能客服、商品文案、数字人直播、供应链预测等全链路场景。目前服务商家数已超80万，618期间AI生成内容点击率提升超35%。"
  },
  {
    id: 5,
    tag: "business",
    tagLabel: "业务动态",
    tagClass: "tag-business",
    date: "2026-07-24",
    source: "Wind金融终端",
    title: "京东「春晓计划」升级：第三方商家数突破150万，平台生态持续扩张",
    summary: "京东零售宣布「春晓计划」再升级，进一步降低第三方商家入驻门槛。截至Q2末，京东平台第三方商家数已突破150万家，POP业务GMV增速连续5个季度超过自营业务。"
  },
  {
    id: 6,
    tag: "market",
    tagLabel: "市场",
    tagClass: "tag-market",
    date: "2026-07-22",
    source: "财联社",
    title: "京东集团(HK:9618)获南下资金连续10日净买入，港股持仓占比创新高",
    summary: "沪深港通数据显示，京东集团港股获南下资金连续10个交易日净买入，累计净买入金额超45亿港元。港股通持仓占比升至8.7%，创历史新高。分析师认为低估值叠加基本面改善是主因。"
  },
  {
    id: 7,
    tag: "business",
    tagLabel: "业务动态",
    tagClass: "tag-business",
    date: "2026-07-20",
    source: "东方财富",
    title: "京东618复盘：即时零售同比增长42%，京东到家覆盖城市突破2000座",
    summary: "京东发布2026年618完整复盘报告。即时零售业务同比增长42%，京东到家已覆盖全国超2000座城市。3C数码和家电品类稳居行业第一，日用百货品类增速超20%。"
  },
  {
    id: 8,
    tag: "tech",
    tagLabel: "技术",
    tagClass: "tag-tech",
    date: "2026-07-18",
    source: "Wind金融终端",
    title: "京东科技启动「数智供应链2030」：5年200亿投入AI和自动化",
    summary: "京东科技发布「数智供应链2030」战略，宣布未来5年投入200亿元用于AI、机器人和供应链自动化技术研发。京东物流亚洲一号智能仓已部署超5000台分拣机器人。"
  },
  {
    id: 9,
    tag: "finance",
    tagLabel: "财报",
    tagClass: "tag-finance",
    date: "2026-07-15",
    source: "同花顺",
    title: "京东健康2026年上半年营收预计增长25%，AI问诊日均突破100万次",
    summary: "京东健康发布业绩预告，预计2026上半年营收同比增长约25%。AI问诊服务日均咨询量突破100万次，累计服务用户超5000万。在线药房SKU超400万，处方药外流红利持续释放。"
  },
  {
    id: 10,
    tag: "market",
    tagLabel: "市场",
    tagClass: "tag-market",
    date: "2026-07-12",
    source: "财联社",
    title: "京东国际「新出海」战略：泰国站升级2.0，印尼市场GMV翻倍",
    summary: "京东国际发布「新出海」战略，泰国站升级为JD Central 2.0，新增本地仓配体系。印尼市场上半年GMV同比增长超过100%，东南亚成为京东海外增速最快区域。"
  }
];

const TIMELINE_DATA = [
  {
    date: "2026年7月",
    title: "京东产发REIT涨超15%，物流地产重估启动",
    desc: "京东产发REIT挂牌以来累涨超15%，总市值突破280亿港元，物流地产资产价值释放。",
    source: "财联社 / 东方财富"
  },
  {
    date: "2026年7月",
    title: "京东618复盘：即时零售同比增长42%",
    desc: "京东到家覆盖2000+城市，全周期GMV创新高，3C家电稳居行业第一。",
    source: "东方财富"
  },
  {
    date: "2026年6月",
    title: "京东产发REIT港交所挂牌",
    desc: "京东产发基础设施REIT正式在港交所挂牌，成为亚洲零售物流REIT新标杆。",
    source: "Wind金融终端"
  },
  {
    date: "2026年5月",
    title: "京东云言犀3.0发布",
    desc: "大模型驱动全链路AI电商升级，服务商家超80万，AI内容点击率提升35%。",
    source: "36氪"
  },
  {
    date: "2026年4月",
    title: "京东物流海外仓突破100个",
    desc: "覆盖全球40+国家，跨境物流最快3日达，外部客户收入占比超72%。",
    source: "同花顺"
  },
  {
    date: "2026年3月",
    title: "京东健康AI问诊覆盖5000万用户",
    desc: "日均在线问诊突破100万次，在线药房SKU超400万。",
    source: "同花顺 / Wind"
  },
  {
    date: "2026年1月",
    title: "京东科技「数智供应链2030」发布",
    desc: "5年投入200亿元推动供应链AI和自动化，亚洲一号部署超5000台机器人。",
    source: "Wind金融终端"
  },
  {
    date: "2025年10月",
    title: "京东零售架构调整：强化品类运营",
    desc: "京东零售组织架构调整，强化品类运营与全渠道融合，提升组织效率与决策速度。",
    source: "财联社"
  },
  {
    date: "2025年8月",
    title: "京东物流连续三季度Non-GAAP盈利",
    desc: "外部客户收入占比超70%，一体化供应链解决方案驱动盈利能力持续改善。",
    source: "东方财富"
  },
  {
    date: "2025年6月",
    title: "京东「春晓计划」第三方商家破百万",
    desc: "降低入驻门槛，POP业务GMV增速连续多个季度超过自营，平台生态加速扩张。",
    source: "36氪 / 财联社"
  }
];

const STATS_DATA = [
  { value: "1.15万亿", label: "2025全年营收", change: "↑ 6.8% YoY", positive: true },
  { value: "6.2亿", label: "年活跃用户", change: "↑ 8.3% YoY", positive: true },
  { value: "150万+", label: "第三方商家", change: "↑ 30% YoY", positive: true },
  { value: "100+", label: "海外仓库", change: "↑ 25% YoY", positive: true },
  { value: "#47", label: "财富全球500强", change: "↑ 5位", positive: true }
];

const TICKER_ITEMS = [
  "📊 京东集团(HK:9618) Q2营收预计超3100亿，获多家机构上调目标价",
  "🏠 京东产发REIT累涨15%，物流地产估值重估进行中",
  "🚀 京东物流海外仓突破100个，跨境3日达覆盖欧美东南亚",
  "🤖 京东云言犀3.0发布，服务商家超80万，AI点击率提升35%",
  "📦 京东618即时零售同比增长42%，覆盖全国2000+城市",
  "💡 京东健康AI问诊日均突破100万次，累计服务5000万用户",
  "🏪 京东第三方商家突破150万，POP增速连续5季超自营",
  "🌍 京东国际印尼GMV翻倍，泰国站升级JD Central 2.0",
  "💰 南下资金连续10日净买入京东港股，持仓占比创新高",
  "🔬 京东科技5年200亿投入供应链AI，5000台机器人部署亚洲一号"
];

// 数据源列表
const DATA_SOURCES = [
  { name: "财联社", url: "https://www.cls.cn", logo: "📰" },
  { name: "东方财富", url: "https://www.eastmoney.com", logo: "📊" },
  { name: "同花顺", url: "https://www.10jqka.com.cn", logo: "📈" },
  { name: "Wind金融终端", url: "https://www.wind.com.cn", logo: "💹" },
  { name: "36氪", url: "https://36kr.com", logo: "🔬" },
  { name: "京东官方", url: "https://corporate.jd.com", logo: "🐕" }
];
