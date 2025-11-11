"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Logo from "@/components/logo"

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"keys" | "sources" | "servers">("keys")
  const [keys, setKeys] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [servers, setServers] = useState<any[]>([])
  const [newSourceName, setNewSourceName] = useState("")
  const [newSourceUrl, setNewSourceUrl] = useState("")
  const [newServerName, setNewServerName] = useState("")
  const [newServerUrl, setNewServerUrl] = useState("")

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

  const addSource = async () => {
    if (!newSourceUrl.trim() || !newSourceName.trim()) return

    try {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSourceName, url: newSourceUrl }),
      })

      if (res.ok) {
        setNewSourceName("")
        setNewSourceUrl("")
        loadData()
      }
    } catch (error) {
      console.error("[v0] Failed to add source:", error)
    }
  }

  const addServer = async () => {
    if (!newServerUrl.trim() || !newServerName.trim()) return

    try {
      const res = await fetch("/api/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServerName,
          host: newServerUrl,
          sshUser: "root",
          sshKey: "",
        }),
      })

      if (res.ok) {
        setNewServerName("")
        setNewServerUrl("")
        loadData()
      }
    } catch (error) {
      console.error("[v0] Failed to add server:", error)
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
            <button
              onClick={() => router.push("/admin/login")}
              className="px-4 py-2 text-gray-400 hover:text-white transition-all hover:scale-105 rounded-lg hover:bg-white/5"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-8 py-8 relative z-10">
        <div className="glass-card rounded-2xl p-2 inline-flex gap-2 mb-8 shine-effect">
          <button
            onClick={() => setActiveTab("keys")}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${activeTab === "keys" ? "luxury-button" : "bg-transparent hover:bg-white/5 hover:scale-105 text-gray-300"}`}
          >
            🔑 User Keys
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${activeTab === "sources" ? "luxury-button" : "bg-transparent hover:bg-white/5 hover:scale-105 text-gray-300"}`}
          >
            📡 M3U Sources
          </button>
          <button
            onClick={() => setActiveTab("servers")}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${activeTab === "servers" ? "luxury-button" : "bg-transparent hover:bg-white/5 hover:scale-105 text-gray-300"}`}
          >
            🖥️ Servers
          </button>
        </div>

        {/* Keys Tab */}
        {activeTab === "keys" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">User Access Keys</h2>
              <button
                onClick={createKey}
                className="luxury-button px-6 py-3 rounded-xl font-medium hover:scale-105 transition-transform"
              >
                + Generate New Key
              </button>
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
                      <button
                        onClick={() => {
                          fetch(`/api/admin/keys?id=${key.id}`, { method: "DELETE" }).then(() => loadData())
                        }}
                        className="ml-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg hover:scale-105 transition-all border border-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === "sources" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">M3U Sources</h2>
            </div>

            <div className="glass-card p-6 rounded-2xl hover-lift">
              <h3 className="text-lg font-semibold mb-4">Add New M3U Source</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="Enter source name..."
                  className="luxury-input w-full px-4 py-3 rounded-xl"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="Enter M3U playlist URL..."
                    className="luxury-input flex-1 px-4 py-3 rounded-xl"
                  />
                  <button
                    onClick={addSource}
                    className="luxury-button px-6 py-3 rounded-xl font-medium hover:scale-105 transition-transform"
                  >
                    + Add Source
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {sources.length === 0 ? (
                <div className="glass-card p-12 rounded-2xl text-center text-gray-400 hover-lift">
                  <div className="text-6xl mb-4 animate-pulse">📡</div>
                  No M3U sources added yet. Add your first source to get started.
                </div>
              ) : (
                sources.map((source) => (
                  <div key={source.id} className="stats-card p-6 rounded-xl hover-lift">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-xl font-semibold text-purple-400 mb-1">{source.name}</p>
                        <p className="text-sm text-gray-400 mb-2">{source.url}</p>
                        <div className="flex gap-4 text-sm text-gray-400">
                          <span>Added: {new Date(source.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className={source.active ? "text-green-400" : "text-red-400"}>
                            {source.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          fetch(`/api/admin/sources?id=${source.id}`, { method: "DELETE" }).then(() => loadData())
                        }}
                        className="ml-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg hover:scale-105 transition-all border border-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Servers Tab */}
        {activeTab === "servers" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Load Balancer Servers</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="stats-card p-4 rounded-xl">
                <div className="text-gray-400 text-sm mb-1">Total Servers</div>
                <div className="text-3xl font-bold text-purple-400">{servers.length}</div>
              </div>
              <div className="stats-card p-4 rounded-xl">
                <div className="text-gray-400 text-sm mb-1">Active Servers</div>
                <div className="text-3xl font-bold text-green-400">
                  {servers.filter((s) => s.status === "active").length}
                </div>
              </div>
              <div className="stats-card p-4 rounded-xl">
                <div className="text-gray-400 text-sm mb-1">Avg Response</div>
                <div className="text-3xl font-bold text-cyan-400">&lt;1ms</div>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl hover-lift">
              <h3 className="text-lg font-semibold mb-4">Add Load Balancer Server</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Server name (e.g. US-East-1)"
                  className="luxury-input w-full px-4 py-3 rounded-xl"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newServerUrl}
                    onChange={(e) => setNewServerUrl(e.target.value)}
                    placeholder="Server URL (e.g. https://server1.example.com)"
                    className="luxury-input flex-1 px-4 py-3 rounded-xl"
                  />
                  <button
                    onClick={addServer}
                    className="luxury-button px-6 py-3 rounded-xl font-medium hover:scale-105 transition-transform"
                  >
                    + Add Server
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {servers.length === 0 ? (
                <div className="glass-card p-12 rounded-2xl text-center text-gray-400 hover-lift">
                  <div className="text-6xl mb-4 animate-pulse">🖥️</div>
                  No servers added yet. Add your first server to get started.
                </div>
              ) : (
                servers.map((server) => (
                  <div key={server.id} className="stats-card p-6 rounded-xl hover-lift">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-xl font-semibold text-cyan-400 mb-1">{server.name}</p>
                        <p className="text-sm text-gray-400 mb-2">{server.host}</p>
                        <div className="flex gap-4 text-sm text-gray-400">
                          <span>Added: {new Date(server.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className={server.status === "active" ? "text-green-400" : "text-red-400"}>
                            {server.status === "active" ? "Online" : "Offline"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          fetch(`/api/admin/servers?id=${server.id}`, { method: "DELETE" }).then(() => loadData())
                        }}
                        className="ml-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg hover:scale-105 transition-all border border-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
