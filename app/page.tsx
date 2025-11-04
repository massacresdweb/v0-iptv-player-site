"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Tv } from "lucide-react"
import { toast } from "sonner"

export default function HomePage() {
  const [key, setKey] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!key.trim()) {
      toast.error("Lütfen KEY giriniz")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("KEY doğrulandı! Yönlendiriliyorsunuz...")
        setTimeout(() => {
          router.push("/player")
        }, 500)
      } else {
        toast.error(data.error || "Geçersiz KEY")
      }
    } catch (error) {
      toast.error("Bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-blue-950/30 to-purple-950/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function() {
            const detectDevTools = () => {
              const threshold = 160;
              if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-size:24px;font-weight:bold;">⚠️ Debugger Algılandı!</div>';
              }
            };
            setInterval(detectDevTools, 1000);
            
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.addEventListener('keydown', e => {
              if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) {
                e.preventDefault();
                return false;
              }
            });
          })();
        `,
        }}
      />

      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/50 animate-pulse">
            <Tv className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
              IQ MASSTV
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1 font-medium">Premium IPTV Platform</p>
          </div>
          <CardDescription className="text-slate-400 text-base">
            Canlı TV, Filmler ve Diziler için KEY'inizi girin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="KEY'inizi buraya girin"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="h-14 text-center text-lg font-mono tracking-wider bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                maxLength={32}
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Doğrulanıyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Giriş Yap
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-center text-sm text-slate-500">
              Admin girişi için{" "}
              <a
                href="/admin/login"
                className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors"
              >
                buraya tıklayın
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
