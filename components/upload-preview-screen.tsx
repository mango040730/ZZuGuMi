"use client"

import { useState, useRef, useEffect } from "react"
import { X, Pen, ChevronLeft } from "lucide-react"

interface UploadPreviewScreenProps {
  onClose: () => void
  onUpload: (questionText: string, mergedImage?: string) => void
  capturedImage?: string
}

export function UploadPreviewScreen({ 
  onClose, 
  onUpload,
  capturedImage
}: UploadPreviewScreenProps) {
  const [step, setStep] = useState<"text" | "mosaic">("text")
  const [questionText, setQuestionText] = useState("")
  const [isMosaicMode, setIsMosaicMode] = useState(false)
  const [strokes, setStrokes] = useState<{x: number, y: number}[][]>([])
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([])
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMosaicIconClick = () => {
    setIsMosaicMode(prev => !prev)
  }

  const handleNextStep = () => {
    if (questionText.trim().length > 0) {
      setStep("mosaic")
    }
  }

  const handlePrevStep = () => {
    setStep("text")
    setIsMosaicMode(false)
  }

  const handleUploadClick = async () => {
    if (isUploading) return

    if (!capturedImage) {
      onUpload(questionText, capturedImage)
      return
    }

    setIsUploading(true)
    try {
      const container = containerRef.current
      if (!container) {
        onUpload(questionText, capturedImage)
        return
      }

      if (typeof window === "undefined") return

      const img = new window.Image()
      img.crossOrigin = "anonymous"
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = capturedImage
      })

      const { clientWidth } = container
      const outWidth = 880
      const outHeight = 1160

      const canvas = document.createElement("canvas")
      canvas.width = outWidth
      canvas.height = outHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        onUpload(questionText, capturedImage)
        return
      }

      const scale = Math.max(outWidth / img.width, outHeight / img.height)
      const sw = outWidth / scale
      const sh = outHeight / scale
      const sx = (img.width - sw) / 2
      const sy = (img.height - sh) / 2

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight)

      if (strokes.length > 0 || currentStroke.length > 0) {
        const strokeScale = outWidth / clientWidth
        const allStrokes = currentStroke.length > 0 ? [...strokes, currentStroke] : strokes

        const blurCanvas = document.createElement("canvas")
        blurCanvas.width = outWidth
        blurCanvas.height = outHeight
        const blurCtx = blurCanvas.getContext("2d")

        if (blurCtx) {
          blurCtx.filter = `blur(${16 * strokeScale}px)`
          blurCtx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight)
          
          const maskCanvas = document.createElement("canvas")
          maskCanvas.width = outWidth
          maskCanvas.height = outHeight
          const maskCtx = maskCanvas.getContext("2d")

          if (maskCtx) {
            maskCtx.strokeStyle = "black"
            maskCtx.fillStyle = "black"
            maskCtx.lineWidth = 50 * strokeScale
            maskCtx.lineCap = "round"
            maskCtx.lineJoin = "round"
            
            maskCtx.shadowColor = "black"
            maskCtx.shadowBlur = 8 * strokeScale

            allStrokes.forEach(stroke => {
              if (stroke.length === 0) return
              if (stroke.length === 1) {
                maskCtx.beginPath()
                maskCtx.arc(stroke[0].x * strokeScale, stroke[0].y * strokeScale, 25 * strokeScale, 0, Math.PI * 2)
                maskCtx.fill()
              } else {
                maskCtx.beginPath()
                maskCtx.moveTo(stroke[0].x * strokeScale, stroke[0].y * strokeScale)
                for (let i = 1; i < stroke.length; i++) {
                  maskCtx.lineTo(stroke[i].x * strokeScale, stroke[i].y * strokeScale)
                }
                maskCtx.stroke()
              }
            })

            maskCtx.shadowColor = "transparent"
            maskCtx.shadowBlur = 0

            maskCtx.globalCompositeOperation = "source-in"
            maskCtx.drawImage(blurCanvas, 0, 0)

            ctx.globalCompositeOperation = "source-over"
            ctx.drawImage(maskCanvas, 0, 0)
          }
        }
      }

      if (questionText.trim().length > 0) {
        const textScale = outWidth / clientWidth
        const fontSize = Math.round(30 * textScale) 
        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.fillStyle = "white"
        ctx.textAlign = "left"
        ctx.textBaseline = "top"

        ctx.shadowColor = "rgba(0, 0, 0, 0.6)"
        ctx.shadowBlur = 12 * textScale
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 4 * textScale

        const padding = 24 * textScale
        const maxWidth = outWidth - (padding * 2)
        const words = questionText.split("\n")
        let currentY = padding

        words.forEach(line => {
          ctx.fillText(line, padding, currentY, maxWidth)
          currentY += fontSize * 1.3 
        })

        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      }

      const mergedImageData = canvas.toDataURL("image/jpeg", 0.9)
      onUpload(questionText, mergedImageData)
    } catch (e) {
      console.error(e)
      onUpload(questionText, capturedImage)
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (step === "text" && textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [questionText, step])

  useEffect(() => {
    if (step === "text" && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [step])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* 💡 닫힘 버튼을 항상 오른쪽에 위치하도록 justify-end 적용 */}
      <div className="p-4 flex justify-end items-center z-50 shrink-0">
        {step === "text" ? (
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center">
            <X className="w-7 h-7 text-white" strokeWidth={1.5} />
          </button>
        ) : (
          <button onClick={handlePrevStep} className="w-10 h-10 flex items-center justify-center">
            <ChevronLeft className="w-9 h-9 text-white" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="flex-1 w-full px-4 pb-2 min-h-0 flex justify-center items-center">
        <div 
          ref={containerRef}
          className={`relative h-full max-h-[75vh] aspect-[22/29] bg-zinc-900 rounded-3xl overflow-hidden shrink-0 ${
            step === "mosaic" && isMosaicMode ? "touch-none cursor-crosshair" : ""
          }`}
          onPointerDown={(e) => {
            if (step === "mosaic" && isMosaicMode) {
              setIsPointerDown(true)
              const rect = e.currentTarget.getBoundingClientRect()
              setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }])
            }
          }}
          onPointerMove={(e) => {
            if (step === "mosaic" && isMosaicMode && isPointerDown) {
              const rect = e.currentTarget.getBoundingClientRect()
              setCurrentStroke(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }])
            }
          }}
          onPointerUp={() => {
            if (step === "mosaic" && isMosaicMode && isPointerDown) {
              setIsPointerDown(false)
              if (currentStroke.length > 0) {
                setStrokes(prev => [...prev, currentStroke])
                setCurrentStroke([])
              }
            }
          }}
        >
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured photo"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          )}

          {capturedImage && (strokes.length > 0 || currentStroke.length > 0) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <defs>
                <filter id="mosaicBlur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="16" />
                </filter>
                <mask id="brushMask">
                  <rect width="100%" height="100%" fill="black" />
                  {[...strokes, currentStroke].map((stroke, i) => {
                    if (stroke.length === 0) return null
                    if (stroke.length === 1) {
                      return <circle key={i} cx={stroke[0].x} cy={stroke[0].y} r="25" fill="white" />
                    }
                    const d = `M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`
                    return (
                      <path
                        key={i}
                        d={d}
                        stroke="white"
                        strokeWidth="50"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    )
                  })}
                </mask>
              </defs>
              <image 
                href={capturedImage} 
                width="100%" 
                height="100%" 
                preserveAspectRatio="xMidYMid slice" 
                filter="url(#mosaicBlur)"
                mask="url(#brushMask)"
              />
            </svg>
          )}
          
          {step === "text" && <div className="absolute inset-0 bg-black/40 pointer-events-none z-20" />}

          {(step === "text" || questionText.length > 0) && (
            <div className={`absolute top-0 left-0 right-0 p-6 flex flex-col z-30 ${step !== "text" ? 'pointer-events-none' : ''}`}>
              {step === "text" ? (
                <textarea
                  ref={textareaRef}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="궁금한 점을 적어보세요"
                  className="w-full bg-transparent text-white text-2xl sm:text-3xl font-bold resize-none outline-none drop-shadow-xl"
                  rows={1}
                />
              ) : (
                <div className="w-full text-white text-2xl sm:text-3xl font-bold drop-shadow-xl whitespace-pre-wrap">
                  {questionText}
                </div>
              )}
            </div>
          )}

          {step === "mosaic" && (
            <div 
              className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40"
              onPointerDown={(e) => e.stopPropagation()} 
            >
              <button 
                onClick={handleMosaicIconClick} 
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                  isMosaicMode ? "bg-white text-black" : "bg-black/40 backdrop-blur-md text-white border border-white/20"
                }`}
              >
                <Pen className="w-5 h-5" />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 💡 하단 버튼 영역: 사진 너비(max-w-sm)와 동일하게 맞추고 w-full 적용 */}
      <div className="flex justify-center pt-4 pb-8 px-4 z-50 shrink-0">
        {step === "text" ? (
          <button 
            onClick={handleNextStep} 
            disabled={questionText.trim().length === 0}
            className="w-full max-w-[calc(100vw-32px)] py-4 bg-[#FF6200] rounded-full text-white text-base font-bold disabled:opacity-50 shadow-lg hover:bg-[#2a2a2a] transition-colors"
          >
            다음
          </button>
        ) : (
          <button 
            onClick={handleUploadClick} 
            disabled={isUploading} 
            className="w-full max-w-[calc(100vw-32px)] py-4 bg-[#FF6200] rounded-full text-white text-base font-bold disabled:opacity-50 shadow-lg hover:bg-[#e55800] transition-colors"
          >
            업로드
          </button>
        )}
      </div>
    </div>
  )
}