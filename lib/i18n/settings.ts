export const supportedLocales = ["en", "fr"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

/** Default until locale is resolved from cookie, route, or Accept-Language. */
export const defaultLocale: SupportedLocale = "en";
