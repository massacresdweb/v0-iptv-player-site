"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import HLSPlayer from "@/components/video-players/hls-player"
import NativePlayer from "@/components/video-players/native-player"

interface MultiPlayerSwitcherProps {
  streamUrl: string
  channelName: string
}

export default function MultiPlayerSwitcher({ streamUrl, channelName }: MultiPlayerSwitcherProps) {
  const [activePlayer, setActivePlayer] = useState<"hls" | "native">("hls")

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="neon-text text-2xl font-bold">{channelName}</h2>

        <div className="flex gap-2">
          <Button
            onClick={() => setActivePlayer("hls")}
            className={activePlayer === "hls" ? "luxury-button" : "bg-white/10"}
            size="sm"
          >
            HLS Ultra
          </Button>
          <Button
            onClick={() => setActivePlayer("native")}
            className={activePlayer === "native" ? "luxury-button" : "bg-white/10"}
            size="sm"
          >
            Native
          </Button>
        </div>
      </div>

      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        {activePlayer === "hls" && <HLSPlayer src={streamUrl} />}
        {activePlayer === "native" && <NativePlayer src={streamUrl} />}
      </div>
    </div>
  )
}
