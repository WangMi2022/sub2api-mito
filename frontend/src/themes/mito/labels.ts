import { useI18n } from 'vue-i18n'

const labels = {
  en: {
    account: 'Account overview', accountDescription: 'Your balance and account shortcuts',
    cost: 'Daily Cost Trend', costDescription: 'Actual cost during the selected period (USD)',
    models: 'Top Models', modelsDescription: 'Ranked by requests during the selected period',
    requests: 'Daily Requests', requestsDescription: 'Request volume during the selected period',
    details: 'View model details', billing: 'Standard cost', period: 'All time',
    input: 'Input Tokens (today)', output: 'Output Tokens (today)',
    home: 'Home', language: 'Language', light: 'Light', dark: 'Dark',
    noData: 'No usage in this period', keys: 'Manage API keys', usage: 'View request logs',
    cacheToday: 'Cache tokens (today)', cacheTotal: 'Cache tokens (all time)', actual: 'Actual cost'
  },
  zh: {
    account: '账户概览', accountDescription: '账户余额与常用入口',
    cost: '每日费用趋势', costDescription: '所选时间内的实际费用（USD）',
    models: '热门模型', modelsDescription: '按所选时间内的请求数排序',
    requests: '每日请求数', requestsDescription: '所选时间内的请求量',
    details: '查看模型明细', billing: '标准费用', period: '累计',
    input: '输入 Tokens（今日）', output: '输出 Tokens（今日）',
    home: '首页', language: '语言', light: '浅色', dark: '深色',
    noData: '此时间段暂无用量', keys: '管理 API 密钥', usage: '查看请求日志',
    cacheToday: '今日缓存 Tokens', cacheTotal: '累计缓存 Tokens', actual: '实际费用'
  }
} as const

export function useMitoLabels() {
  const { locale } = useI18n()
  return (key: keyof typeof labels.en) => labels[locale?.value?.startsWith('zh') ? 'zh' : 'en'][key]
}
