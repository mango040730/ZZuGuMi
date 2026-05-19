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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  const zoomLevels = [0.5, 1, 2, 3, 5]

  // 0.5배율(광각)인지 여부 판단
  const isUltrawide = zoomLevel === 0.5

  useEffect(() => {
    async function startCamera() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      setIsReady(false)

      try {
        // 1. 카메라 장치 이름(label)을 읽기 위해 권한 요청 및 장치 목록 불러오기
        let currentDevices = devices
        if (currentDevices.length === 0 || currentDevices[0]?.label === "") {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
          const allDevices = await navigator.mediaDevices.enumerateDevices()
          currentDevices = allDevices.filter(d => d.kind === 'videoinput')
          setDevices(currentDevices)
          tempStream.getTracks().forEach(track => track.stop()) 
        }

        let videoConstraints: MediaTrackConstraints = {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        }

        // 2. 후면 카메라일 경우에만 광각/일반 렌즈 구분
        if (facingMode === "environment") {
          // label 속성 텍스트를 기반으로 후면 카메라 필터링
          const backCameras = currentDevices.filter(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.includes("후면") ||
            d.label.toLowerCase().includes("environment")
          )
          
          // 후면 카메라를 명확히 찾지 못했다면 전체 카메라 풀 사용 (안전 장치)
          const cameraPool = backCameras.length > 0 ? backCameras : currentDevices

          if (isUltrawide) {
            // 초광각 렌즈 찾기
            const ultrawideCam = cameraPool.find(d => 
              d.label.toLowerCase().includes("ultra") || 
              (d.label.toLowerCase().includes("wide") && !d.label.toLowerCase().includes("telephoto")) || 
              d.label.includes("광각") || 
              d.label.includes("0.5")
            )
            
            if (ultrawideCam) {
              videoConstraints = {
                deviceId: { exact: ultrawideCam.deviceId },
                width: { ideal: 1080 },
                height: { ideal: 1920 }
              }
            }
          } else {
            // 1배율 이상일 때는 일반 렌즈로 연결
            const standardCam = cameraPool.find(d => 
              !d.label.toLowerCase().includes("ultra") && 
              !d.label.includes("광각") &&
              !d.label.includes("0.5")
            )
            
            if (standardCam) {
              videoConstraints = {
                deviceId: { exact: standardCam.deviceId },
                width: { ideal: 1080 },
                height: { ideal: 1920 }
              }
            }
          }
        }

        // 3. 최종 결정된 렌즈로 카메라 시작
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
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
  }, [facingMode, isUltrawide, devices]) // 의존성 배열에 devices 추가

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
      
      const rawScale = isUltrawide ? 1 : zoomLevel
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

  const displayScale = isUltrawide ? 1 : zoomLevel

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
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              transform: "scale(" + (facingMode === "user" ? -displayScale : displayScale) + ", " + displayScale + ")"
            }}
          />
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 p-6 pt-12 z-20 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-md">
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
              className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold ${
                zoomLevel === level ? "bg-[#d4e510] text-black" : "text-white hover:bg-white/20"
              }`}
            >
              {level}x
            </button>
          ))}
        </div>

        <div className="relative flex items-center justify-center w-full px-8 mt-2">
          <button onClick={handleCapture} disabled={!isReady} className="w-[80px] h-[80px] rounded-full bg-white flex items-center justify-center shadow-lg">
            <div className="w-[66px] h-[66px] rounded-full border-[3px] border-black" />
          </button>
          <button onClick={toggleCamera} className="absolute right-8 w-12 h-12 flex items-center justify-center bg-black/30 rounded-full backdrop-blur-md">
            <RefreshCw className="w-6 h-6 text-white" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}