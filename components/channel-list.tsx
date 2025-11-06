"use client"

import { useState } from "react"
import { Search, Star, Grid, List } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  category?: string
  is_favorite: boolean
}

interface ChannelListProps {
  channels: Channel[]
  selectedChannel: Channel | null
  onSelectChannel: (channel: Channel) => void
  onToggleFavorite: (channelId: string) => void
}

export function ChannelList({ channels, selectedChannel, onSelectChannel, onToggleFavorite }: ChannelListProps) {
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const categories = Array.from(new Set(channels.map((c) => c.category).filter(Boolean)))

  const filteredChannels = channels.filter((channel) => {
    if (search && !channel.name.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (filterCategory && channel.category !== filterCategory) {
      return false
    }
    if (showFavoritesOnly && !channel.is_favorite) {
      return false
    }
    return true
  })

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Kanal ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="text-white"
          >
            <Star className="h-4 w-4 mr-1" />
            Favoriler
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            className={cn("text-white", viewMode === "list" && "bg-slate-800")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={cn("text-white", viewMode === "grid" && "bg-slate-800")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <ScrollArea className="w-full">
            <div className="flex gap-2">
              <Badge
                variant={filterCategory === null ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterCategory(null)}
              >
                Tümü
              </Badge>
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={filterCategory === category ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setFilterCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Channel List */}
      <ScrollArea className="flex-1">
        <div className={cn("p-4", viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-2")}>
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className={cn(
                "rounded-lg border border-slate-700 p-3 cursor-pointer transition-colors hover:bg-slate-800",
                selectedChannel?.id === channel.id && "bg-slate-800 border-blue-500",
                viewMode === "grid" && "flex flex-col items-center text-center",
              )}
            >
              {viewMode === "grid" ? (
                <>
                  {channel.logo ? (
                    <img
                      src={channel.logo || "/placeholder.svg"}
                      alt={channel.name}
                      className="w-16 h-16 object-contain mb-2 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-800 rounded flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-slate-400">{channel.name[0]}</span>
                    </div>
                  )}
                  <p className="font-medium text-sm line-clamp-2 text-white">{channel.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-2 h-8 w-8 text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(channel.id)
                    }}
                  >
                    <Star className={cn("h-4 w-4", channel.is_favorite && "fill-yellow-400 text-yellow-400")} />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  {channel.logo ? (
                    <img
                      src={channel.logo || "/placeholder.svg"}
                      alt={channel.name}
                      className="w-12 h-12 object-contain rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center">
                      <span className="text-xl font-bold text-slate-400">{channel.name[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-white">{channel.name}</p>
                    {channel.category && <p className="text-sm text-slate-400">{channel.category}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(channel.id)
                    }}
                  >
                    <Star className={cn("h-4 w-4", channel.is_favorite && "fill-yellow-400 text-yellow-400")} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredChannels.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-400">Kanal bulunamadı</p>
          </div>
        )}
      </ScrollArea>

      {/* Results Count */}
      <div className="p-4 border-t border-slate-800 text-sm text-slate-400">
        {filteredChannels.length} / {channels.length} kanal
      </div>
    </div>
  )
}
