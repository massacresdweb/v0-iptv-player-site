"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        setError("Invalid credentials")
        setLoading(false)
        return
      }

      router.push("/admin")
    } catch {
      setError("Connection error")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <div className="glass-card w-full max-w-md p-8 rounded-2xl">
        <h1 className="neon-text text-3xl font-bold text-center mb-8">Admin Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="luxury-input bg-white/5 border-white/20 text-white"
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="luxury-input bg-white/5 border-white/20 text-white"
          />

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>
          )}

          <Button type="submit" disabled={loading} className="luxury-button w-full">
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  )
}
