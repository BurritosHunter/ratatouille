"use client";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/translation.json";
import fr from "@/locales/fr/translation.json";

import { defaultLocale } from "./settings";

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: defaultLocale,
    fallbackLng: "en",
    supportedLngs: ["en", "fr"],
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    interpolation: { escapeValue: false },
    defaultNS: "translation",
    ns: ["translation"],
  });
}

export { i18next };
