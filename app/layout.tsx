import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "MassTV - Premium Streaming Platform",
  description: "Ultra-secure, high-performance IPTV streaming platform",
  generator: "MassTV",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased min-h-screen bg-black">{children}</body>
    </html>
  )
}
