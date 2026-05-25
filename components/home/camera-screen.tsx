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
  const zoomLevels = [1, 2, 3]

  const initialDistance = useRef<number | null>(null)
  const initialZoom = useRef<number>(1)

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
    const video = videoRef.current
    const canvas = canvasRef.current
    const container = video?.parentElement
    
    if (!video || !canvas || !container) return
    
    const screenAspect = container.clientWidth / container.clientHeight
    const videoAspect = video.videoWidth / video.videoHeight
    
    let cropWidth = video.videoWidth
    let cropHeight = video.videoHeight
    let cropX = 0
    let cropY = 0

    if (videoAspect > screenAspect) {
      cropWidth = video.videoHeight * screenAspect
      cropX = (video.videoWidth - cropWidth) / 2
    } else {
      cropHeight = video.videoWidth / screenAspect
      cropY = (video.videoHeight - cropHeight) / 2
    }

    const sourceWidth = cropWidth / zoomLevel
    const sourceHeight = cropHeight / zoomLevel
    const sourceX = cropX + (cropWidth - sourceWidth) / 2
    const sourceY = cropY + (cropHeight - sourceHeight) / 2

    canvas.width = 1080
    canvas.height = 1080 / screenAspect
    
    const ctx = canvas.getContext("2d")
    if (ctx) {
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      
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
    setZoomLevel(1) 
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      initialDistance.current = dist
      initialZoom.current = zoomLevel
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scaleFactor = currentDist / initialDistance.current
      const newZoom = Math.min(Math.max(1, initialZoom.current * scaleFactor), 5)
      setZoomLevel(newZoom)
    }
  }

  const handleTouchEnd = () => {
    initialDistance.current = null
  }

  return (
    <div 
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="absolute inset-0 w-full h-full bg-zinc-900">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white text-center px-8 text-sm">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-75 ease-out"
            style={{ 
              transform: `scale(${facingMode === "user" ? -zoomLevel : zoomLevel}, ${zoomLevel})`
            }}
          />
        )}
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between pointer-events-none">
        
        {/* 수정된 부분: justify-between -> justify-end */}
        <div className="p-4 flex justify-end items-center pointer-events-auto">
          <button
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-md"
            aria-label="Close camera"
          >
            <X className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col w-full pointer-events-auto">
          
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-4 px-5 py-2 bg-black/40 backdrop-blur-md rounded-full shadow-lg">
              {zoomLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setZoomLevel(level)}
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    Math.abs(zoomLevel - level) < 0.1
                      ? "bg-[#d4e510] text-black" 
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  {level}x
                </button>
              ))}
            </div>
          </div>

          <div className="pb-12 pt-6 flex flex-col items-center justify-center bg-gradient-to-t from-black/50 to-transparent">
            <div className="relative flex items-center justify-center w-full max-w-sm px-8">
              <button
                onClick={handleCapture}
                disabled={!isReady}
                className="w-[80px] h-[80px] rounded-full bg-white flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] z-10"
                aria-label="Take photo"
              >
                <div className="w-[66px] h-[66px] rounded-full border-[3px] border-black" />
              </button>

              <button
                onClick={toggleCamera}
                className="absolute right-8 w-12 h-12 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-md transition-transform active:rotate-180 duration-300"
                aria-label="Flip camera"
              >
                <RefreshCw className="w-5 h-5 text-white" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}