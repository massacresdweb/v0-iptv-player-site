"use client"

import { useRef, useEffect, useState } from "react"

interface NativePlayerProps {
  src: string
}

export default function NativePlayer({ src }: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ buffer: 0, playing: false })

  useEffect(() => {
    if (!videoRef.current) return

    const video = videoRef.current

    video.preload = "auto"
    video.autoplay = true
    video.playsInline = true

    const loadAndPlay = async () => {
      try {
        video.load()
        await video.play()
        console.log("[v0] Native player started")
      } catch (err) {
        console.log("[v0] Native player error:", err)
        setError("Oynatma başarısız - Tıklayın")
      }
    }

    loadAndPlay()

    const handleError = (e: Event) => {
      console.log("[v0] Video error:", e)
      setError("Yükleme hatası - Yeniden deneniyor...")
      setTimeout(() => {
        loadAndPlay()
      }, 2000)
    }

    const updateStats = () => {
      if (video.buffered.length > 0) {
        setStats({
          buffer: video.buffered.end(video.buffered.length - 1) - video.currentTime,
          playing: !video.paused && !video.ended,
        })
      }
    }

    video.addEventListener("error", handleError)
    video.addEventListener("playing", () => {
      setError(null)
      setStats((prev) => ({ ...prev, playing: true }))
    })
    video.addEventListener("waiting", () => {
      console.log("[v0] Buffering...")
    })
    video.addEventListener("canplay", () => {
      console.log("[v0] Can play")
    })

    const interval = setInterval(updateStats, 500)

    return () => {
      clearInterval(interval)
      video.removeEventListener("error", handleError)
    }
  }, [src])

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
        muted={false}
        preload="auto"
        src={src}
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-yellow-500 text-center p-4">
            <p className="text-xl font-bold mb-2">{error}</p>
            <button
              onClick={() => {
                setError(null)
                videoRef.current?.play()
              }}
              className="luxury-button px-4 py-2"
            >
              Oynat
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg border border-white/20 backdrop-blur-sm">
        <div className="font-mono space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Player:</span>
            <span className="text-green-400 font-bold">Native HTML5</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Status:</span>
            <span className={stats.playing ? "text-green-400" : "text-yellow-400"}>
              {stats.playing ? "Playing" : "Buffering"}
            </span>
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
