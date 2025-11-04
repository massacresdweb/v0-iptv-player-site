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
  stream_url: string
  logo_url: string | null
  category: string | null
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
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className="h-4 w-4 mr-1" />
            Favorites
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("list")}
            className={cn(viewMode === "list" && "bg-accent")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={cn(viewMode === "grid" && "bg-accent")}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>

        {/* Category Filters */}
        <ScrollArea className="w-full">
          <div className="flex gap-2">
            <Badge
              variant={filterCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterCategory(null)}
            >
              All
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
      </div>

      {/* Channel List */}
      <ScrollArea className="flex-1">
        <div
          className={cn(
            "p-4",
            viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2",
          )}
        >
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className={cn(
                "rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent",
                selectedChannel?.id === channel.id && "bg-accent border-primary",
                viewMode === "grid" && "flex flex-col items-center text-center",
              )}
            >
              {viewMode === "grid" ? (
                <>
                  {channel.logo_url ? (
                    <img
                      src={channel.logo_url || "/placeholder.svg"}
                      alt={channel.name}
                      className="w-16 h-16 object-contain mb-2"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-muted-foreground">{channel.name[0]}</span>
                    </div>
                  )}
                  <p className="font-medium text-sm line-clamp-2">{channel.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-2 h-8 w-8"
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
                  {channel.logo_url ? (
                    <img
                      src={channel.logo_url || "/placeholder.svg"}
                      alt={channel.name}
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <span className="text-xl font-bold text-muted-foreground">{channel.name[0]}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{channel.name}</p>
                    {channel.category && <p className="text-sm text-muted-foreground">{channel.category}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
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
      </ScrollArea>

      {/* Results Count */}
      <div className="p-4 border-t text-sm text-muted-foreground">
        {filteredChannels.length} of {channels.length} channels
      </div>
    </div>
  )
}
