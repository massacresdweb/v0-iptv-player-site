"use client"

import { useState, useEffect } from "react"
import { VideoPlayer } from "@/components/video-player"
import { ChannelList } from "@/components/channel-list"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, Tv, Film, LaptopMinimal as TvMinimal } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  category?: string
  is_favorite: boolean
}

export default function PlayerPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyInfo, setKeyInfo] = useState<any>(null)
  const [contentType, setContentType] = useState<"live" | "movies" | "series">("live")

  useEffect(() => {
    checkSession()
    fetchChannels()

    const detectDevTools = () => {
      const threshold = 160
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        toast.error("Debugger algılandı! Sayfa kapatılıyor...")
        setTimeout(() => (window.location.href = "/"), 1000)
      }
    }

    const interval = setInterval(detectDevTools, 1000)

    document.addEventListener("contextmenu", (e) => e.preventDefault())
    document.addEventListener("keydown", (e) => {
      if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
        e.preventDefault()
        toast.error("Bu işlem engellenmiştir!")
      }
    })

    return () => clearInterval(interval)
  }, [])

  const checkSession = async () => {
    try {
      const response = await fetch("/api/validate-key", { method: "GET" })
      if (!response.ok) {
        router.push("/")
      } else {
        const data = await response.json()
        setKeyInfo(data)
      }
    } catch (error) {
      router.push("/")
    }
  }

  const fetchChannels = async () => {
    try {
      const response = await fetch("/api/channels")
      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels || [])
        if (data.channels && data.channels.length > 0) {
          setSelectedChannel(data.channels[0])
        }
      } else {
        toast.error("Kanallar yüklenemedi")
      }
    } catch (error) {
      console.error("[v0] Failed to fetch channels:", error)
      toast.error("Bağlantı hatası")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async (channelId: string) => {
    setChannels((prev) => prev.map((ch) => (ch.id === channelId ? { ...ch, is_favorite: !ch.is_favorite } : ch)))
    toast.success("Favori güncellendi")
  }

  const handleLogout = () => {
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Kanallar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 bg-slate-900 border-slate-800">
              <ChannelList
                channels={channels}
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
                onToggleFavorite={handleToggleFavorite}
              />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Tv className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              IQ MASSTV
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {keyInfo && (
            <div className="hidden md:block text-sm text-slate-400">
              KEY: {keyInfo.key?.substring(0, 8)}... | Süre: {new Date(keyInfo.expiresAt).toLocaleDateString("tr-TR")}
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-80 border-r border-slate-800 bg-slate-900/30">
          <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-slate-900 border-b border-slate-800 rounded-none">
              <TabsTrigger value="live" className="data-[state=active]:bg-slate-800">
                <TvMinimal className="h-4 w-4 mr-2" />
                Canlı TV
              </TabsTrigger>
              <TabsTrigger value="movies" className="data-[state=active]:bg-slate-800">
                <Film className="h-4 w-4 mr-2" />
                Filmler
              </TabsTrigger>
              <TabsTrigger value="series" className="data-[state=active]:bg-slate-800">
                <Tv className="h-4 w-4 mr-2" />
                Diziler
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="flex-1 overflow-hidden mt-0">
              <ChannelList
                channels={channels.filter((ch) => !ch.category || ch.category === "live")}
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
                onToggleFavorite={handleToggleFavorite}
              />
            </TabsContent>

            <TabsContent value="movies" className="flex-1 overflow-hidden mt-0">
              <ChannelList
                channels={channels.filter((ch) => ch.category === "movie")}
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
                onToggleFavorite={handleToggleFavorite}
              />
            </TabsContent>

            <TabsContent value="series" className="flex-1 overflow-hidden mt-0">
              <ChannelList
                channels={channels.filter((ch) => ch.category === "series")}
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
                onToggleFavorite={handleToggleFavorite}
              />
            </TabsContent>
          </Tabs>
        </aside>

        {/* Player Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedChannel ? (
            <div className="flex-1 flex flex-col p-4 md:p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedChannel.name}</h2>
                {selectedChannel.category && <p className="text-slate-400">{selectedChannel.category}</p>}
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-5xl">
                  <VideoPlayer
                    src={`/api/stream/${encodeURIComponent(selectedChannel.url)}`}
                    poster={selectedChannel.logo}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-xl text-slate-400">Kanal bulunamadı</p>
                <p className="text-sm text-slate-500 mt-2">Admin ile iletişime geçin</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
