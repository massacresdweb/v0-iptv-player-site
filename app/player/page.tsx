"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import MultiPlayerSwitcher from "@/components/multi-player-switcher"
import ChannelList from "@/components/channel-list"
import Logo from "@/components/logo"

interface Channel {
  id: string
  name: string
  logo: string
  category: string
  url: string
}

export default function PlayerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (channels.length > 0) {
      const channelId = searchParams.get("channel")
      if (channelId) {
        const channel = channels.find((c) => c.id === channelId)
        if (channel) {
          setSelectedChannel(channel)
        }
      }
    }
  }, [channels, searchParams])

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/session")
      if (!res.ok) {
        router.push("/login")
        return
      }

      loadChannels()
    } catch {
      router.push("/login")
    }
  }

  const loadChannels = async () => {
    try {
      const res = await fetch("/api/channels")
      if (!res.ok) throw new Error("Failed to load channels")

      const data = await res.json()
      setChannels(data.channels || [])
    } catch (error) {
      console.error("[v0] Failed to load channels:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel)
    router.push(`/player?channel=${channel.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0F19] text-white relative overflow-hidden">
      <div className="fixed top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />
      <div
        className="fixed bottom-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "3s" }}
      />

      <header className="glass-card border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="small" />
          <button
            onClick={() => {
              fetch("/api/session", { method: "DELETE" })
              router.push("/login")
            }}
            className="px-4 py-2 text-gray-400 hover:text-white transition-all hover:scale-105 rounded-lg hover:bg-white/5"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="container mx-auto p-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Channel List */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-4 h-[calc(100vh-180px)] overflow-y-auto hover-lift">
              <h2 className="text-lg font-semibold mb-4 text-gray-300 flex items-center gap-2">
                <span className="text-2xl">📺</span>
                Channels
              </h2>
              <ChannelList
                channels={channels}
                selectedChannel={selectedChannel}
                onSelectChannel={handleChannelSelect}
              />
            </div>
          </div>

          {/* Player */}
          <div className="lg:col-span-3">
            {selectedChannel ? (
              <div className="glass-card rounded-2xl overflow-hidden hover-lift shine-effect">
                <MultiPlayerSwitcher
                  streamUrl={`/api/stream/${encodeURIComponent(selectedChannel.url)}`}
                  channelName={selectedChannel.name}
                />
              </div>
            ) : (
              <div className="glass-card p-16 rounded-2xl text-center hover-lift">
                <div className="animate-pulse-glow mb-6">
                  <Logo size="large" className="justify-center" />
                </div>
                <h2 className="neon-text text-3xl font-bold mb-3">Welcome to MassTV</h2>
                <p className="text-gray-400 text-lg">Select a channel from the sidebar to begin streaming</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
