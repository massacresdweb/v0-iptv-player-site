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
      <body className="font-sans antialiased">
        <div className="floating-orb w-[500px] h-[500px] bg-primary top-[10%] left-[5%]" />
        <div
          className="floating-orb w-[400px] h-[400px] bg-accent top-[60%] right-[10%]"
          style={{ animationDelay: "-10s" }}
        />
        {children}
      </body>
    </html>
  )
}
