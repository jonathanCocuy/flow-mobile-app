import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import pt from './locales/pt';

const LANG_KEY = '@flowx_language';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

function getDeviceLanguage(): LanguageCode {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
  const supported = SUPPORTED_LANGUAGES.map((l) => l.code);
  return (supported.includes(locale as LanguageCode) ? locale : 'en') as LanguageCode;
}

export async function initI18n() {
  let stored: LanguageCode | null = null;
  try {
    stored = (await AsyncStorage.getItem(LANG_KEY)) as LanguageCode | null;
  } catch {}

  const lng = stored ?? getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, es: { translation: es }, fr: { translation: fr }, pt: { translation: pt } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export async function changeLanguage(code: LanguageCode) {
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(LANG_KEY, code);
  } catch {}
}

export default i18n;
