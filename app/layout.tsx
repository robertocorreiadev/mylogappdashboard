import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { Toaster } from '@/components/ui/sonner'
import { parseTheme, themeColor, THEME_COOKIE } from '@/lib/theme'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MYLOG · Painel de Controle',
  description: 'Portal de gestão de entregas e financeiro MYLOG',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

async function currentTheme() {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value)
}

// A cor da barra do navegador acompanha o tema escolhido (cookie), não o
// tema do sistema operacional.
export async function generateViewport(): Promise<Viewport> {
  const theme = await currentTheme()
  return { colorScheme: theme, themeColor: themeColor(theme) }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const theme = await currentTheme()
  return (
    <html lang="pt-BR" data-theme={theme} className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster theme={theme} />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
