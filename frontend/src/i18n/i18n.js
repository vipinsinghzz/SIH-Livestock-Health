import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './en.json';
import hiTranslation from './hi.json';
import mrTranslation from './mr.json';

const resources = {
  en: { translation: enTranslation },
  hi: { translation: hiTranslation },
  mr: { translation: mrTranslation },

  // Regional dialect fallbacks
  'en-IN': { translation: enTranslation },
  'hi-IN': { translation: hiTranslation },
  'mr-IN': { translation: mrTranslation }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'hi',
    load: 'languageOnly',
    cleanCode: true,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    }
  });

export default i18n;
