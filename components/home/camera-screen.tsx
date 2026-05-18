"use client"

import { X, RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface CameraScreenProps {
  onClose: () => void
  onCapture: (imageData: string) => void
}

export function CameraScreen({ onClose, onCapture }: CameraScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [zoomLevel, setZoomLevel] = useState<number>(1)

  const zoomLevels = [0.5, 1, 2, 3, 5]

  useEffect(() => {
    async function startCamera() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      setIsReady(false)
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1080 },
            height: { ideal: 1920 }
          }
        })
        
        streamRef.current = stream
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            setIsReady(true)
          }
        }
      } catch (err) {
        console.error("Camera access error:", err)
        setError("카메라에 접근할 수 없습니다")
      }
    }

    startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode])

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    onClose()
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext("2d")
    if (ctx) {
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      
      const rawScale = zoomLevel * 2
      const sourceWidth = video.videoWidth / rawScale
      const sourceHeight = video.videoHeight / rawScale
      const sourceX = (video.videoWidth - sourceWidth) / 2
      const sourceY = (video.videoHeight - sourceHeight) / 2
      
      ctx.drawImage(
        video,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, canvas.width, canvas.height
      )
      
      const imageData = canvas.toDataURL("image/jpeg", 0.9)
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      onCapture(imageData)
    }
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment")
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {error ? (
          <p className="text-white text-center px-8 z-10">{error}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out"
            style={{ 
              transform: `scale(${facingMode === "user" ? -(zoomLevel * 2) : zoomLevel * 2}, ${zoomLevel * 2})`
            }}
          />
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 p-6 pt-12 z-20 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-md"
          aria-label="Close camera"
        >
          <X className="w-6 h-6 text-white" strokeWidth={1.5} />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-24 bg-gradient-to-t from-black/80 to-transparent z-20 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-8 px-5 py-2 bg-black/50 backdrop-blur-md rounded-full shadow-lg">
          {zoomLevels.map((level) => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                zoomLevel === level 
                  ? "bg-[#d4e510] text-black" 
                  : "text-white hover:bg-white/20"
              }`}
            >
              {level}x
            </button>
          ))}
        </div>

        <div className="relative flex items-center justify-center w-full px-8 mt-2">
          <button
            onClick={handleCapture}
            disabled={!isReady}
            className="w-[80px] h-[80px] rounded-full bg-white flex items-center justify-center disabled:opacity-50 transition-opacity shadow-[0_0_20px_rgba(255,255,255,0.3)] z-10"
            aria-label="Take photo"
          >
            <div className="w-[66px] h-[66px] rounded-full border-[3px] border-black" />
          </button>

          <button
            onClick={toggleCamera}
            className="absolute right-8 w-12 h-12 flex items-center justify-center bg-black/30 rounded-full backdrop-blur-md transition-transform active:rotate-180 duration-300"
            aria-label="Flip camera"
          >
            <RefreshCw className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}