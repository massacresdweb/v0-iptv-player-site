"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Channel {
  id: string
  name: string
  logo: string
  category: string
  url: string
}

interface ChannelListProps {
  channels: Channel[]
  selectedChannel: Channel | null
  onSelectChannel: (channel: Channel) => void
}

export default function ChannelList({ channels, selectedChannel, onSelectChannel }: ChannelListProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(channels.map((c) => c.category)))

  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || channel.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="glass-card h-[80vh] rounded-2xl p-4 flex flex-col gap-4">
      <Input
        placeholder="Search channels..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="luxury-input bg-white/5 border-white/20 text-white"
      />

      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                selectedChannel?.id === channel.id
                  ? "bg-gradient-to-r from-purple-600/40 to-blue-600/40 border border-white/20"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <img
                src={channel.logo || "/placeholder.svg"}
                alt={channel.name}
                className="w-10 h-10 rounded object-cover"
              />
              <div className="flex-1 text-left">
                <p className="font-medium text-white">{channel.name}</p>
                <p className="text-xs text-gray-400">{channel.category}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
