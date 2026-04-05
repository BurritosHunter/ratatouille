import { Geist_Mono, Figtree, Montserrat } from "next/font/google"

import "./globals.css"
import { AuthSessionProvider } from "@/components/providers/auth-session-provider"
import { SiteHeader } from "@/components/organisms/site-header"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const montserratHeading = Montserrat({subsets:['latin'],variable:'--font-heading'});

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", figtree.variable, montserratHeading.variable)}
    >
      <body>
        <AuthSessionProvider>
          <ThemeProvider>
            <SiteHeader />
            {children}
            <Toaster position="bottom-right" duration={8000} closeButton />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
