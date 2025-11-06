"use client"

import { useRef, useEffect, useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoPlayerProps {
  src: string
  poster?: string
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hlsRef = useRef<any>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) {
      console.log("[v0] VideoPlayer: Missing video element or src")
      return
    }

    console.log("[v0] ========== VIDEO PLAYER INIT ==========")
    console.log("[v0] Stream URL:", src)

    setIsLoading(true)
    setError(null)

    const initPlayer = async () => {
      try {
        // Check if HLS.js is supported
        const HlsModule = await import("hls.js")
        const Hls = HlsModule.default

        console.log("[v0] HLS.js loaded successfully")

        if (Hls.isSupported()) {
          console.log("[v0] HLS.js is supported, initializing...")

          // Destroy previous instance
          if (hlsRef.current) {
            console.log("[v0] Destroying previous HLS instance")
            hlsRef.current.destroy()
          }

          const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
          })

          hlsRef.current = hls

          console.log("[v0] Loading source:", src)
          hls.loadSource(src)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log("[v0] ✅ Manifest parsed, starting playback")
            setIsLoading(false)
            video.play().catch((err) => {
              console.log("[v0] Autoplay blocked:", err.message)
              setIsPlaying(false)
            })
          })

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error("[v0] ❌ HLS Error:", data.type, data.details)

            if (data.fatal) {
              setIsLoading(false)
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log("[v0] Network error, retrying...")
                  setError("Ağ hatası, yeniden deneniyor...")
                  setTimeout(() => hls.startLoad(), 1000)
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log("[v0] Media error, recovering...")
                  setError("Medya hatası, düzeltiliyor...")
                  hls.recoverMediaError()
                  break
                default:
                  console.error("[v0] Fatal error, cannot recover")
                  setError("Yayın yüklenemedi")
                  break
              }
            }
          })
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          console.log("[v0] Native HLS support detected")
          video.src = src
          setIsLoading(false)
        } else {
          console.error("[v0] ❌ HLS not supported")
          setError("Bu tarayıcı HLS desteklemiyor")
          setIsLoading(false)
        }
      } catch (err) {
        console.error("[v0] ❌ Failed to initialize player:", err)
        setError("Video player başlatılamadı")
        setIsLoading(false)
      }
    }

    initPlayer()

    return () => {
      if (hlsRef.current) {
        console.log("[v0] Cleaning up HLS instance")
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
      />

      {/* Loading Overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-white text-sm">Yükleniyor...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center p-6">
            <p className="text-red-400 text-lg mb-2">⚠️ Hata</p>
            <p className="text-white">{error}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>

          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
