import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { defaultNS, resources, supportedLngs } from './resources';

const STORAGE_KEY = 'lipsum:language';
const FALLBACK = 'en';

const isSupported = (value: string): boolean =>
  (supportedLngs as readonly string[]).includes(value);

const detectInitialLanguage = (): string => {
  if (typeof window === 'undefined') return FALLBACK;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isSupported(stored)) return stored;
  } catch {
    // localStorage unavailable; fall through.
  }
  const navLang = window.navigator.language?.split('-')[0];
  if (navLang && isSupported(navLang)) return navLang;
  return FALLBACK;
};

const syncDocumentLang = (lng: string): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
};

const persistLanguage = (lng: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // Storage may be full or disabled in the current context.
  }
};

if (!i18n.isInitialized) {
  const initial = detectInitialLanguage();
  void i18n.use(initReactI18next).init({
    resources,
    lng: initial,
    fallbackLng: FALLBACK,
    supportedLngs,
    defaultNS,
    ns: ['common', 'chrome', 'screens', 'app', 'templates', 'tours', 'help'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  syncDocumentLang(initial);
  i18n.on('languageChanged', (lng: string) => {
    syncDocumentLang(lng);
    persistLanguage(lng);
  });
}

export default i18n;
