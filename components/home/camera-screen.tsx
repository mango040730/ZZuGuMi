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
  
  // 💡 [수정] 기본 배율을 실제 카메라와 같은 1배(1x)로 정상화합니다.
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const zoomLevels = [1, 2, 3] // 스마트폰에서 가장 많이 쓰이는 표준 줌 배율

  // ✌️ 두 손가락 핀치 줌을 위한 상태
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
    // 💡 타입스크립트 에러 해결: 변수를 먼저 선언하고 확실하게 null 체크를 진행합니다.
    const video = videoRef.current
    const canvas = canvasRef.current
    const container = video?.parentElement
    
    if (!video || !canvas || !container) return
    
    // 💡 [핵심 1] 화면에 보이는 비율 그대로 캡처하기 위해 실제 컨테이너의 가로/세로 비율을 구합니다.
    const screenAspect = container.clientWidth / container.clientHeight
    const videoAspect = video.videoWidth / video.videoHeight
    
    let cropWidth = video.videoWidth
    let cropHeight = video.videoHeight
    let cropX = 0
    let cropY = 0

    // object-cover 속성과 동일하게, 넘치는 화면 부분을 미리 잘라냅니다.
    if (videoAspect > screenAspect) {
      cropWidth = video.videoHeight * screenAspect
      cropX = (video.videoWidth - cropWidth) / 2
    } else {
      cropHeight = video.videoWidth / screenAspect
      cropY = (video.videoHeight - cropHeight) / 2
    }

    // 💡 [핵심 2] 사용자가 조작한 줌 배율만큼 이미지 중심부를 확대하여 잘라냅니다.
    const sourceWidth = cropWidth / zoomLevel
    const sourceHeight = cropHeight / zoomLevel
    const sourceX = cropX + (cropWidth - sourceWidth) / 2
    const sourceY = cropY + (cropHeight - sourceHeight) / 2

    // 캡처 해상도 고정 (가로는 1080px 기준, 세로는 핸드폰 비율에 맞춤)
    canvas.width = 1080
    canvas.height = 1080 / screenAspect
    
    const ctx = canvas.getContext("2d")
    if (ctx) {
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      
      // 잘라낸 이미지를 캔버스에 꽉 차게 그립니다.
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
    setZoomLevel(1) // 카메라 전환 시 줌 초기화
  }

  // ✌️ 핀치 줌(두 손가락 확대/축소) 터치 이벤트 핸들러
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
      // 최대 5배줌, 최소 1배줌 사이에서 부드럽게 조절
      const newZoom = Math.min(Math.max(1, initialZoom.current * scaleFactor), 5)
      setZoomLevel(newZoom)
    }
  }

  const handleTouchEnd = () => {
    initialDistance.current = null
  }

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {error ? (
          <p className="text-white text-center px-8 z-10">{error}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-75 ease-out"
            style={{ 
              // 💡 억지스러운 2배 뻥튀기를 제거하고, 실제 1x 배율 기반으로 움직이게 설정
              transform: `scale(${facingMode === "user" ? -zoomLevel : zoomLevel}, ${zoomLevel})`
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

      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-24 bg-gradient-to-t from-black/80 to-transparent z-20 flex flex-col items-center pointer-events-none">
        
        {/* 줌 인디케이터 및 버튼 컨트롤 */}
        <div className="flex flex-col items-center gap-2 mb-8 pointer-events-auto">
          <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-semibold tracking-wider transition-opacity">
            {zoomLevel.toFixed(1)}x
          </div>
          
          <div className="flex items-center gap-3 px-5 py-2 bg-black/50 backdrop-blur-md rounded-full shadow-lg">
            {zoomLevels.map((level) => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  Math.abs(zoomLevel - level) < 0.1 // 핀치줌 조작 시 근사치 버튼 하이라이트
                    ? "bg-[#d4e510] text-black" 
                    : "text-white hover:bg-white/20"
                }`}
              >
                {level}x
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center w-full px-8 mt-2 pointer-events-auto">
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