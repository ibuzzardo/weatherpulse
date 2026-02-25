import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'WeatherPulse', description: 'Real-time weather dashboard' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>)
}
