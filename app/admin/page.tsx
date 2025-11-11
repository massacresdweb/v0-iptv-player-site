"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"keys" | "sources" | "servers">("keys")
  const [keys, setKeys] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [servers, setServers] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      if (activeTab === "keys") {
        const res = await fetch("/api/admin/keys")
        if (res.ok) {
          const data = await res.json()
          setKeys(data.keys || [])
        }
      } else if (activeTab === "sources") {
        const res = await fetch("/api/admin/sources")
        if (res.ok) {
          const data = await res.json()
          setSources(data.sources || [])
        }
      } else if (activeTab === "servers") {
        const res = await fetch("/api/admin/servers")
        if (res.ok) {
          const data = await res.json()
          setServers(data.servers || [])
        }
      }
    } catch (error) {
      console.error("[v0] Failed to load data:", error)
    }
  }

  const createKey = async () => {
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxConnections: 1 }),
      })

      if (res.ok) {
        loadData()
      }
    } catch (error) {
      console.error("[v0] Failed to create key:", error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F19] text-white relative overflow-hidden">
      <div className="fixed top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />
      <div
        className="fixed bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "4s" }}
      />

      <header className="glass-card border-b border-white/10 backdrop-blur-xl relative z-10">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Logo size="small" />
              <div>
                <h1 className="neon-text text-3xl font-bold tracking-tight mb-1">Admin Dashboard</h1>
                <p className="text-gray-400">Manage your MassTV platform</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/login")}
              className="text-gray-400 hover:text-white transition-all hover:scale-105"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-8 py-8 relative z-10">
        <div className="glass-card rounded-2xl p-2 inline-flex gap-2 mb-8 shine-effect">
          <Button
            onClick={() => setActiveTab("keys")}
            className={`transition-all duration-300 ${activeTab === "keys" ? "luxury-button" : "bg-transparent hover:bg-white/5 hover:scale-105"}`}
          >
            🔑 User Keys
          </Button>
          <Button
            onClick={() => setActiveTab("sources")}
            className={`transition-all duration-300 ${activeTab === "sources" ? "luxury-button" : "bg-transparent hover:bg-white/5 hover:scale-105"}`}
          >
            📡 M3U Sources
          </Button>
          <Button
            onClick={() => setActiveTab("servers")}
            className={`transition-all duration-300 ${activeTab === "servers" ? "luxury-button" : "bg-transparent hover:bg-white/5 hover:scale-105"}`}
          >
            🖥️ Servers
          </Button>
        </div>

        {/* Content */}
        {activeTab === "keys" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">User Access Keys</h2>
              <Button onClick={createKey} className="luxury-button hover:scale-105 transition-transform">
                + Generate New Key
              </Button>
            </div>

            <div className="grid gap-4">
              {keys.length === 0 ? (
                <div className="glass-card p-12 rounded-2xl text-center text-gray-400 hover-lift">
                  <div className="text-6xl mb-4 animate-pulse">🔐</div>
                  No keys generated yet. Create your first key to get started.
                </div>
              ) : (
                keys.map((key) => (
                  <div key={key.id} className="stats-card p-6 rounded-xl hover-lift">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-mono text-xl text-purple-400 mb-2 hover:text-purple-300 transition-colors">
                          {key.key}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-400">
                          <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Connections: {key.max_connections}</span>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          fetch(`/api/admin/keys?id=${key.id}`, { method: "DELETE" }).then(() => loadData())
                        }}
                        className="ml-4 hover:scale-105 transition-transform"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "sources" && (
          <div className="space-y-4">
            <div className="text-center text-gray-400">M3U source management coming soon</div>
          </div>
        )}

        {activeTab === "servers" && (
          <div className="space-y-4">
            <div className="text-center text-gray-400">Server management coming soon</div>
          </div>
        )}
      </div>
    </div>
  )
}
