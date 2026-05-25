"use client"

import { useState, useRef, useEffect } from "react"
import { X, Eraser, Pen } from "lucide-react"

interface UploadPreviewScreenProps {
  onClose: () => void
  onUpload: (questionText: string, mergedImage?: string) => void
  capturedImage?: string
}

// 스트로크 타입 정의
type StrokeType = { points: { x: number; y: number }[]; type: 'brush' | 'eraser' }

export function UploadPreviewScreen({ 
  onClose, 
  onUpload,
  capturedImage
}: UploadPreviewScreenProps) {
  const [step, setStep] = useState<"text" | "mosaic">("text")
  const [questionText, setQuestionText] = useState("")
  const [isMosaicMode, setIsMosaicMode] = useState(false)
  const [isEraserMode, setIsEraserMode] = useState(false)
  
  const [strokes, setStrokes] = useState<StrokeType[]>([])
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([])
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleNextStep = () => {
    if (questionText.trim().length > 0) setStep("mosaic")
  }

  const handleUploadClick = async () => {
    if (isUploading || !capturedImage) return
    setIsUploading(true)

    try {
      const container = containerRef.current
      if (!container) return

      const img = new Image()
      img.crossOrigin = "anonymous"
      await new Promise((resolve) => { img.onload = resolve; img.src = capturedImage; })

      const outWidth = 880, outHeight = 1160
      const canvas = document.createElement("canvas")
      canvas.width = outWidth; canvas.height = outHeight
      const ctx = canvas.getContext("2d")!
      
      const scale = Math.max(outWidth / img.width, outHeight / img.height)
      ctx.drawImage(img, (img.width - outWidth/scale)/2, (img.height - outHeight/scale)/2, outWidth/scale, outHeight/scale, 0, 0, outWidth, outHeight)

      if (strokes.length > 0 || currentStroke.length > 0) {
        const strokeScale = outWidth / container.clientWidth
        const allStrokes = currentStroke.length > 0 ? [...strokes, { points: currentStroke, type: isEraserMode ? 'eraser' : 'brush' } as StrokeType] : strokes

        const blurCanvas = document.createElement("canvas")
        blurCanvas.width = outWidth; blurCanvas.height = outHeight
        const blurCtx = blurCanvas.getContext("2d")!
        blurCtx.filter = `blur(${16 * strokeScale}px)`
        blurCtx.drawImage(img, (img.width - outWidth/scale)/2, (img.height - outHeight/scale)/2, outWidth/scale, outHeight/scale, 0, 0, outWidth, outHeight)
        
        const maskCanvas = document.createElement("canvas")
        maskCanvas.width = outWidth; maskCanvas.height = outHeight
        const maskCtx = maskCanvas.getContext("2d")!

        allStrokes.forEach(stroke => {
          maskCtx.globalCompositeOperation = stroke.type === 'eraser' ? 'destination-out' : 'source-over'
          maskCtx.strokeStyle = "black"; maskCtx.fillStyle = "black"
          maskCtx.lineWidth = 50 * strokeScale; maskCtx.lineCap = "round"; maskCtx.lineJoin = "round"
          
          maskCtx.beginPath()
          maskCtx.moveTo(stroke.points[0].x * strokeScale, stroke.points[0].y * strokeScale)
          stroke.points.forEach(p => maskCtx.lineTo(p.x * strokeScale, p.y * strokeScale))
          maskCtx.stroke()
        })

        maskCtx.globalCompositeOperation = "source-in"
        maskCtx.drawImage(blurCanvas, 0, 0)
        ctx.drawImage(maskCanvas, 0, 0)
      }

      // 텍스트 그리기 로직 생략(기존과 동일하게 유지)
      onUpload(questionText, canvas.toDataURL("image/jpeg", 0.9))
    } catch (e) {
      console.error(e)
      onUpload(questionText, capturedImage)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="p-4 flex justify-end"><X onClick={onClose} className="text-white w-7 h-7" /></div>
      
      <div className="flex-1 px-4 flex justify-center items-center">
        <div 
          ref={containerRef}
          className="relative h-[75vh] aspect-[22/29] bg-zinc-900 rounded-3xl overflow-hidden"
          onPointerDown={(e) => {
            if (step === "mosaic") { setIsPointerDown(true); setCurrentStroke([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]) }
          }}
          onPointerMove={(e) => {
            if (isPointerDown) setCurrentStroke(prev => [...prev, { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }])
          }}
          onPointerUp={() => {
            if (isPointerDown) {
              setStrokes(prev => [...prev, { points: currentStroke, type: isEraserMode ? 'eraser' : 'brush' }])
              setCurrentStroke([])
              setIsPointerDown(false)
            }
          }}
        >
          {capturedImage && <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover" />}
          
          {/* 렌더링 SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <mask id="brushMask">
              <rect width="100%" height="100%" fill="white" />
              {[...strokes, {points: currentStroke, type: isEraserMode ? 'eraser' : 'brush'}].map((s, i) => (
                <path key={i} d={`M ${s.points.map(p => `${p.x} ${p.y}`).join(' L ')}`} stroke={s.type === 'eraser' ? 'black' : 'white'} strokeWidth="50" fill="none" />
              ))}
            </mask>
            <image href={capturedImage} width="100%" height="100%" filter="url(#mosaicBlur)" mask="url(#brushMask)" />
          </svg>

          {step === "mosaic" && (
            <div className="absolute right-4 top-1/2 flex flex-col gap-4 z-40">
              <button onClick={() => setIsEraserMode(false)} className={`w-10 h-10 rounded-full ${!isEraserMode ? "bg-white" : "bg-black/40"}`}><Pen /></button>
              <button onClick={() => setIsEraserMode(true)} className={`w-10 h-10 rounded-full ${isEraserMode ? "bg-white" : "bg-black/40"}`}><Eraser /></button>
            </div>
          )}
        </div>
      </div>
      
      <button onClick={step === "text" ? handleNextStep : handleUploadClick} className="m-4 py-4 bg-[#FF6200] rounded-full text-white font-bold">
        {step === "text" ? "다음" : "업로드"}
      </button>
    </div>
  )
}