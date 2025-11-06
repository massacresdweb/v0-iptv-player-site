"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Key, Database, Server } from "lucide-react"
import { toast } from "sonner"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/login")
      const data = await response.json()

      if (!data.success) {
        router.push("/admin/login")
      } else {
        setLoading(false)
      }
    } catch (error) {
      router.push("/admin/login")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" })
      toast.success("Çıkış yapıldı")
      router.push("/admin/login")
    } catch (error) {
      toast.error("Çıkış yapılırken hata oluştu")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">MASSTV Admin</h1>
          <p className="text-sm text-slate-400">Yönetim Paneli</p>
          <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Çıkış
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-6">
          <Button
            variant={pathname === "/admin" ? "default" : "outline"}
            onClick={() => router.push("/admin")}
            className="gap-2"
          >
            <Key className="w-4 h-4" />
            KEY Yönetimi
          </Button>
          <Button
            variant={pathname === "/admin/m3u-sources" ? "default" : "outline"}
            onClick={() => router.push("/admin/m3u-sources")}
            className="gap-2"
          >
            <Database className="w-4 h-4" />
            M3U Kaynakları
          </Button>
          <Button
            variant={pathname === "/admin/servers" ? "default" : "outline"}
            onClick={() => router.push("/admin/servers")}
            className="gap-2"
          >
            <Server className="w-4 h-4" />
            Sunucular
          </Button>
        </nav>

        {children}
      </div>
    </div>
  )
}
