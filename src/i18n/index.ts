import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { defaultNS, resources, supportedLngs } from './resources';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs,
    defaultNS,
    ns: ['common', 'chrome', 'screens', 'app', 'templates'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
