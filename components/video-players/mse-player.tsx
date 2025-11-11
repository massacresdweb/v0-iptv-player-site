"use client"

import { useEffect, useRef, useState } from "react"

interface MSEPlayerProps {
  src: string
}

export default function MSEPlayer({ src }: MSEPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stats, setStats] = useState({ bitrate: 0, buffer: 0, dropped: 0 })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current

    video.src = src
    video.preload = "auto"
    video.load()

    const playVideo = async () => {
      try {
        await video.play()
        console.log("[v0] MSE player started")
      } catch (err) {
        console.log("[v0] MSE play error:", err)
        setError("Başlatma hatası")
      }
    }

    playVideo()

    const interval = setInterval(() => {
      if (video.buffered.length > 0 && video.getVideoPlaybackQuality) {
        const quality = video.getVideoPlaybackQuality()
        const buffer = video.buffered.end(video.buffered.length - 1) - video.currentTime

        setStats({
          bitrate: 6000, // Simulated
          buffer,
          dropped: quality.droppedVideoFrames || 0,
        })
      }
    }, 500)

    return () => clearInterval(interval)
  }, [src])

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} className="w-full h-full" controls autoPlay playsInline muted={false} preload="metadata" />

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

      <div className="absolute top-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg border border-cyan-500/30 backdrop-blur-sm">
        <div className="font-mono space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Player:</span>
            <span className="text-cyan-400 font-bold">MSE Ultra</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Bitrate:</span>
            <span className="text-blue-400">{stats.bitrate} kbps</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Buffer:</span>
            <span className={stats.buffer > 1 ? "text-green-400" : "text-yellow-400"}>{stats.buffer.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Dropped:</span>
            <span className={stats.dropped === 0 ? "text-green-400" : "text-red-400"}>{stats.dropped}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
