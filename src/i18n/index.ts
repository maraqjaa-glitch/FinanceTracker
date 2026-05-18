import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import pl from './pl.json'
import en from './en.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: { translation: pl },
      en: { translation: en },
    },
    lng: 'pl', // default; overridden from uiStore on app boot
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    defaultNS: 'translation',
  })

export default i18n
