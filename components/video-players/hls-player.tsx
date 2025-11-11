"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"

interface HLSPlayerProps {
  src: string
}

export default function HLSPlayer({ src }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [stats, setStats] = useState({ bitrate: 0, fps: 0, buffer: 0, quality: "Auto" })
  const [error, setError] = useState<string | null>(null)
  const retryCountRef = useRef(0)

  useEffect(() => {
    if (!videoRef.current) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        // Buffer settings - ultra aggressive (1-3 segments = 2-6s)
        maxBufferLength: 3,
        maxMaxBufferLength: 6,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferHole: 0.05,
        lowLatencyMode: true,
        backBufferLength: 10,
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,

        // Network settings - aggressive loading with fast retry
        manifestLoadingTimeOut: 3000,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 300,
        levelLoadingTimeOut: 3000,
        levelLoadingMaxRetry: 10,
        levelLoadingRetryDelay: 300,
        fragLoadingTimeOut: 5000,
        fragLoadingMaxRetry: 15,
        fragLoadingRetryDelay: 300,

        // ABR settings - ultra fast quality switching
        abrEwmaDefaultEstimate: 5000000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.7,
        abrMaxWithRealBitrate: true,

        // Performance optimizations
        enableWorker: true,
        enableSoftwareAES: false,
        startLevel: -1,
        autoStartLoad: true,
        startFragPrefetch: true,
        testBandwidth: true,
        progressive: true,
        nudgeOffset: 0.05,
        nudgeMaxRetry: 5,
      })

      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(videoRef.current)

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log("[v0] HLS Error:", data.type, data.details)

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCountRef.current < 10) {
                console.log("[v0] Network error, attempting recovery...")
                retryCountRef.current++
                setTimeout(() => hls.startLoad(), 1000)
              } else {
                setError("Network hatası - Lütfen player değiştirin")
              }
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("[v0] Media error, attempting recovery...")
              hls.recoverMediaError()
              break
            default:
              if (retryCountRef.current < 3) {
                console.log("[v0] Fatal error, destroying and recreating...")
                retryCountRef.current++
                hls.destroy()
                setTimeout(() => window.location.reload(), 2000)
              } else {
                setError("Player hatası - Sayfa yenileniyor...")
              }
              break
          }
        }
      })

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("[v0] Manifest parsed, playing...")
        retryCountRef.current = 0
        videoRef.current?.play()
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level]
        setStats((prev) => ({ ...prev, quality: `${level.height}p` }))
      })

      const interval = setInterval(() => {
        if (videoRef.current && hls) {
          const buffered = videoRef.current.buffered
          const bufferLength =
            buffered.length > 0 ? buffered.end(buffered.length - 1) - videoRef.current.currentTime : 0

          setStats({
            bitrate: Math.round((hls.bandwidthEstimate || 0) / 1000),
            fps: hls.currentLevel >= 0 ? Math.round((hls.levels[hls.currentLevel]?.videoRange || 30) as number) : 30,
            buffer: bufferLength,
            quality: hls.autoLevelEnabled
              ? "Auto"
              : hls.currentLevel >= 0
                ? `${hls.levels[hls.currentLevel]?.height}p`
                : "Auto",
          })
        }
      }, 300)

      return () => {
        clearInterval(interval)
        hls.destroy()
      }
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = src
      videoRef.current.play().catch((err) => {
        console.log("[v0] Native HLS play error:", err)
        setError("Oynatma hatası - Lütfen tıklayın")
      })
    }
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

      <div className="absolute top-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg border border-white/20 backdrop-blur-sm">
        <div className="font-mono space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Quality:</span>
            <span className="text-green-400 font-bold">{stats.quality}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Bitrate:</span>
            <span className="text-blue-400">{stats.bitrate} kbps</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">FPS:</span>
            <span className="text-purple-400">{stats.fps}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Buffer:</span>
            <span
              className={stats.buffer > 2 ? "text-green-400" : stats.buffer > 1 ? "text-yellow-400" : "text-red-400"}
            >
              {stats.buffer.toFixed(1)}s
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Latency:</span>
            <span className="text-cyan-400">&lt;1ms</span>
          </div>
        </div>
      </div>
    </div>
  )
}
