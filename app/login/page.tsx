"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  const router = useRouter()
  const [key, setKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Invalid key")
        setLoading(false)
        return
      }

      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })

      router.push("/player")
    } catch (err) {
      setError("Connection error")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0A0F19]">
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "5s" }}
      />
      <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-pulse-glow" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-10 rounded-2xl hover-lift shine-effect">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <Logo size="large" />
            </div>
            <p className="text-gray-400 text-sm">Premium IPTV Streaming Platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Input
                type="text"
                placeholder="Enter Your Access Key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="luxury-input w-full bg-white/5 border-white/20 text-white placeholder:text-gray-500 h-14 text-lg"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg p-3 animate-shake">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !key}
              className="luxury-button w-full h-14 text-base font-semibold rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚡</span>
                  Verifying...
                </span>
              ) : (
                "Access Platform"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <a
              href="/admin/login"
              className="text-sm text-gray-500 hover:text-purple-400 transition-all duration-300 hover:scale-105 inline-block"
            >
              Administrator Portal →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
