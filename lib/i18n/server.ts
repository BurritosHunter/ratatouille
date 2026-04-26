import { createInstance, type TFunction } from "i18next";

import en from "@/locales/en/translation.json";
import fr from "@/locales/fr/translation.json";

import type { SupportedLocale } from "./settings";

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

/**
 * Per-request i18n for React Server Components. Pass the active locale when you add detection.
 */
export function getServerT(locale: SupportedLocale = "en"): TFunction<"translation", undefined> {
  const i18n = createInstance();
  i18n.init({
    lng: locale,
    fallbackLng: "en",
    resources,
    interpolation: { escapeValue: false },
    defaultNS: "translation",
    ns: ["translation"],
  });
  return i18n.getFixedT(locale);
}
