import { Geist_Mono, Figtree, Montserrat } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { AuthSessionProvider } from "@/components/providers/auth-session-provider"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/helpers/utils"

const montserratHeading = Montserrat({subsets:['latin'],variable:'--font-heading'});
const figtree = Figtree({subsets:['latin'],variable:'--font-sans'})
const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    template: "%s | Ratatouille",
    default: "Ratatouille",
  },
  description: "Ratatouille is a recipe management system that helps you manage your recipes and ingredients.",
  icons: "/favicon.ico",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased", fontMono.variable, "font-sans", figtree.variable, montserratHeading.variable)}
    >
      <body className="h-full overflow-hidden">
        <AuthSessionProvider>
          <ThemeProvider>
            <I18nProvider>
              <div className="h-full min-h-0">{children}</div>
              <Toaster position="bottom-right" duration={8000} closeButton />
            </I18nProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
