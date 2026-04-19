import en from './i18n/locales/en.json'
import ja from './i18n/locales/ja.json'
import zhCN from './i18n/locales/zh-CN.json'
import zhTW from './i18n/locales/zh-TW.json'

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  messages: {
    en,
    ja,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
  },
}))
