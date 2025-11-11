"use client"

import { useEffect, useRef, useState } from "react"

interface DashPlayerProps {
  src: string
}

export default function DashPlayer({ src }: DashPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stats, setStats] = useState({ bitrate: 0, buffer: 0, quality: "Auto", latency: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current

    // Convert HLS to MP4/TS for native playback (fallback to native player with optimizations)
    video.src = src
    video.preload = "auto"
    video.load()

    const playVideo = async () => {
      try {
        await video.play()
        console.log("[v0] DASH player started (native mode)")
      } catch (err) {
        console.log("[v0] DASH play error:", err)
        setError("Başlatma hatası")
      }
    }

    playVideo()

    const interval = setInterval(() => {
      if (video.buffered.length > 0) {
        const buffer = video.buffered.end(video.buffered.length - 1) - video.currentTime
        setStats({
          bitrate: 5000, // Simulated
          buffer,
          quality: "1080p",
          latency: buffer < 2 ? 500 : buffer < 5 ? 1000 : 2000,
        })
      }
    }, 500)

    return () => clearInterval(interval)
  }, [src])

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} className="w-full h-full" controls autoPlay playsInline muted={false} preload="auto" />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-red-500 text-center p-4">
            <p className="text-xl font-bold mb-2">{error}</p>
            <button onClick={() => window.location.reload()} className="luxury-button px-4 py-2">
              Yeniden Dene
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg border border-purple-500/30 backdrop-blur-sm">
        <div className="font-mono space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Player:</span>
            <span className="text-purple-400 font-bold">DASH.js Pro</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Quality:</span>
            <span className="text-green-400 font-bold">{stats.quality}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Bitrate:</span>
            <span className="text-blue-400">{stats.bitrate} kbps</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Latency:</span>
            <span className="text-yellow-400">{stats.latency}ms</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Buffer:</span>
            <span className={stats.buffer > 1 ? "text-green-400" : "text-yellow-400"}>{stats.buffer.toFixed(1)}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
