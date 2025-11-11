"use client"

import { useState } from "react"
import HLSPlayer from "@/components/video-players/hls-player"
import NativePlayer from "@/components/video-players/native-player"
import DashPlayer from "@/components/video-players/dash-player"
import MSEPlayer from "@/components/video-players/mse-player"
import TurboPlayer from "@/components/video-players/turbo-player"

interface MultiPlayerSwitcherProps {
  streamUrl: string
  channelName: string
}

export default function MultiPlayerSwitcher({ streamUrl, channelName }: MultiPlayerSwitcherProps) {
  const [activePlayer, setActivePlayer] = useState<"hls" | "native" | "dash" | "mse" | "turbo">("hls")

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="neon-text text-2xl font-bold">{channelName}</h2>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActivePlayer("hls")}
            className={`px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
              activePlayer === "hls" ? "luxury-button" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            🎯 HLS Ultra
          </button>
          <button
            onClick={() => setActivePlayer("dash")}
            className={`px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
              activePlayer === "dash" ? "luxury-button" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            💎 DASH Pro
          </button>
          <button
            onClick={() => setActivePlayer("mse")}
            className={`px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
              activePlayer === "mse" ? "luxury-button" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            🚀 MSE Ultra
          </button>
          <button
            onClick={() => setActivePlayer("turbo")}
            className={`px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
              activePlayer === "turbo" ? "luxury-button" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            ⚡ TURBO
          </button>
          <button
            onClick={() => setActivePlayer("native")}
            className={`px-4 py-2 rounded-lg font-medium transition-all hover:scale-105 ${
              activePlayer === "native" ? "luxury-button" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            🎬 Native
          </button>
        </div>
      </div>

      <div className="aspect-video bg-black rounded-lg overflow-hidden shine-effect">
        {activePlayer === "hls" && <HLSPlayer src={streamUrl} />}
        {activePlayer === "native" && <NativePlayer src={streamUrl} />}
        {activePlayer === "dash" && <DashPlayer src={streamUrl} />}
        {activePlayer === "mse" && <MSEPlayer src={streamUrl} />}
        {activePlayer === "turbo" && <TurboPlayer src={streamUrl} />}
      </div>
    </div>
  )
}
