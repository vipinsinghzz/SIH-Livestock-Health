import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './en.json';
import hiTranslation from './hi.json';
import mrTranslation from './mr.json';
import guTranslation from './gu.json';
import paTranslation from './pa.json';
import bnTranslation from './bn.json';
import taTranslation from './ta.json';
import teTranslation from './te.json';
import knTranslation from './kn.json';
import mlTranslation from './ml.json';
import orTranslation from './or.json';

const resources = {
  en: { translation: enTranslation },
  hi: { translation: hiTranslation },
  mr: { translation: mrTranslation },
  gu: { translation: guTranslation },
  pa: { translation: paTranslation },
  bn: { translation: bnTranslation },
  ta: { translation: taTranslation },
  te: { translation: teTranslation },
  kn: { translation: knTranslation },
  ml: { translation: mlTranslation },
  or: { translation: orTranslation },

  // Regional dialect fallbacks
  'en-IN': { translation: enTranslation },
  'hi-IN': { translation: hiTranslation },
  'mr-IN': { translation: mrTranslation },
  'gu-IN': { translation: guTranslation },
  'pa-IN': { translation: paTranslation },
  'bn-IN': { translation: bnTranslation },
  'ta-IN': { translation: taTranslation },
  'te-IN': { translation: teTranslation },
  'kn-IN': { translation: knTranslation },
  'ml-IN': { translation: mlTranslation },
  'or-IN': { translation: orTranslation }
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
