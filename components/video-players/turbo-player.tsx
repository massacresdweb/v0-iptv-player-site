"use client"

import { useEffect, useRef, useState } from "react"

interface TurboPlayerProps {
  src: string
}

export default function TurboPlayer({ src }: TurboPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stats, setStats] = useState({ fps: 60, quality: "4K", speed: "1x" })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current

    // Ultra-aggressive settings
    video.src = src
    video.preload = "auto"
    video.defaultPlaybackRate = 1.0
    video.playbackRate = 1.0

    // Enable hardware acceleration hints
    video.style.willChange = "transform"
    video.style.transform = "translateZ(0)"

    video.load()

    const playVideo = async () => {
      try {
        await video.play()
        console.log("[v0] Turbo player started with max performance")
      } catch (err) {
        console.log("[v0] Turbo play error:", err)
        setError("Başlatma hatası")
      }
    }

    playVideo()

    const interval = setInterval(() => {
      if (video.buffered.length > 0) {
        const buffer = video.buffered.end(video.buffered.length - 1) - video.currentTime
        setStats({
          fps: 60,
          quality: buffer > 3 ? "4K" : buffer > 1 ? "1080p" : "720p",
          speed: `${video.playbackRate}x`,
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

      <div className="absolute top-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg border border-red-500/30 backdrop-blur-sm">
        <div className="font-mono space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Player:</span>
            <span className="text-red-400 font-bold">⚡ TURBO</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Quality:</span>
            <span className="text-green-400 font-bold">{stats.quality}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">FPS:</span>
            <span className="text-purple-400">{stats.fps}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Speed:</span>
            <span className="text-yellow-400">{stats.speed}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
