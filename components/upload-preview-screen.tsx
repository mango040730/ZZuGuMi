"use client"

import { useState, useRef, useEffect } from "react"
import { X, Type } from "lucide-react"

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
  const [questionText, setQuestionText] = useState("")
  const [isTextMode, setIsTextMode] = useState(false)
  const [isMosaicMode, setIsMosaicMode] = useState(false)
  const [strokes, setStrokes] = useState<{x: number, y: number}[][]>([])
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([])
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTextIconClick = () => {
    setIsTextMode(prev => !prev)
    setIsMosaicMode(false)
  }

  const handleMosaicIconClick = () => {
    setIsMosaicMode(prev => !prev)
    setIsTextMode(false)
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

      const { clientWidth, clientHeight } = container
      const outWidth = img.width
      const outHeight = img.width * (clientHeight / clientWidth)

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
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [questionText, isTextMode])

  useEffect(() => {
    if (isTextMode && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isTextMode])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="p-4 flex justify-between items-center z-50">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center">
          <X className="w-6 h-6 text-white" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-full max-w-sm">
          <div 
            ref={containerRef}
            className={`relative aspect-[3/4] bg-zinc-900 rounded-3xl overflow-hidden ${
              isMosaicMode ? "touch-none cursor-crosshair" : ""
            }`}
            onPointerDown={(e) => {
              if (isMosaicMode) {
                setIsPointerDown(true)
                const rect = e.currentTarget.getBoundingClientRect()
                setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }])
              } else if (isTextMode) {
                setIsTextMode(false)
              }
            }}
            onPointerMove={(e) => {
              if (isMosaicMode && isPointerDown) {
                const rect = e.currentTarget.getBoundingClientRect()
                setCurrentStroke(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }])
              }
            }}
            onPointerUp={() => {
              if (isMosaicMode && isPointerDown) {
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
            
            {isTextMode && <div className="absolute inset-0 bg-black/40 pointer-events-none z-20" />}

            {(isTextMode || questionText.length > 0) && (
              <div className={`absolute top-0 left-0 right-0 p-6 flex flex-col z-30 ${!isTextMode ? 'pointer-events-none' : ''}`}>
                <textarea
                  ref={textareaRef}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={isTextMode ? "궁금한 점을 적어보세요" : ""}
                  className="w-full bg-transparent text-white text-3xl font-bold resize-none outline-none drop-shadow-xl"
                  rows={1}
                />
              </div>
            )}

            <div 
              className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40"
              onPointerDown={(e) => e.stopPropagation()} 
            >
              <button 
                onClick={handleTextIconClick} 
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                  isTextMode ? "bg-white text-black" : "bg-black/40 backdrop-blur-md text-white border border-white/20"
                }`}
              >
                <Type className="w-5 h-5" />
              </button>
              <button 
                onClick={handleMosaicIconClick} 
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                  isMosaicMode ? "bg-white text-black" : "bg-black/40 backdrop-blur-md text-white border border-white/20"
                }`}
              >
                <svg 
                  width="22" 
                  height="22" 
                  viewBox="0 0 22 22" 
                  fill="none" 
                  className={isMosaicMode ? "stroke-black" : "stroke-white"} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M3.5 21V16M3.5 6V1M1 3.5H6M1 18.5H6M12 2L10.2658 6.50886C9.98381 7.24209 9.84281 7.60871 9.62353 7.91709C9.42919 8.1904 9.1904 8.42919 8.91709 8.62353C8.60871 8.8428 8.24209 8.98381 7.50886 9.26582L3 11L7.50886 12.7342C8.24209 13.0162 8.60871 13.1572 8.91709 13.3765C9.1904 13.5708 9.42919 13.8096 9.62353 14.0829C9.84281 14.3913 9.98381 14.7579 10.2658 15.4911L12 20L13.7342 15.4911C14.0162 14.7579 14.1572 14.3913 14.3765 14.0829C14.5708 13.8096 14.8096 13.5708 15.0829 13.3765C15.3913 13.1572 15.7579 13.0162 16.4911 12.7342L21 11L16.4911 9.26582C15.7579 8.98381 15.3913 8.8428 15.0829 8.62353C14.8096 8.42919 14.5708 8.1904 14.3765 7.91709C14.1572 7.60871 14.0162 7.24209 13.7342 6.50886L12 2Z" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </div>

      <div className="flex justify-center pb-12 z-50">
        <button onClick={handleUploadClick} disabled={isUploading} className="px-8 py-3 bg-[#3a3a3a] rounded-full text-white text-sm font-medium disabled:opacity-50 shadow-lg hover:bg-[#2a2a2a] transition-colors">
          업로드
        </button>
      </div>
    </div>
  )
}