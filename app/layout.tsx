import { Geist_Mono, Figtree, Montserrat } from "next/font/google"

import "./globals.css"
import { AuthSessionProvider } from "@/components/providers/auth-session-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/helpers/utils"

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
      className={cn("h-full antialiased", fontMono.variable, "font-sans", figtree.variable, montserratHeading.variable)}
    >
      <body className="h-full overflow-hidden">
        <AuthSessionProvider>
          <ThemeProvider>
            <div className="h-full min-h-0">{children}</div>
            <Toaster position="bottom-right" duration={8000} closeButton />
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
