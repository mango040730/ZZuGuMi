"use client"

import { useState, useRef, useEffect } from "react"
import { X, Type, Droplet } from "lucide-react"
import Image from "next/image"

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

      const img = new globalThis.Image()
      img.crossOrigin = "anonymous"
      img.src = capturedImage
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
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

      // 1. 기본 원본 이미지 그리기
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight)

      // 2. 모자이크(블러) 처리 로직 진행
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
            maskCtx.strokeStyle = "white"
            maskCtx.fillStyle = "white"
            maskCtx.lineWidth = 50 * strokeScale
            maskCtx.lineCap = "square"
            maskCtx.lineJoin = "round"
            maskCtx.filter = `blur(${6 * strokeScale}px)`

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

            blurCtx.globalCompositeOperation = "destination-in"
            blurCtx.drawImage(maskCanvas, 0, 0)

            ctx.globalCompositeOperation = "source-over"
            ctx.drawImage(blurCanvas, 0, 0)
          }
        }
      }

      // ✍️ 3. [핵심 수정] 입력된 텍스트를 이미지 파일 위에 영구적으로 그리기
      if (questionText.trim().length > 0) {
        const textScale = outWidth / clientWidth
        
        // 폰트 스타일 설정 (모바일 브라우저 기준 크기 비례 계산)
        const fontSize = Math.round(30 * textScale) 
        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.fillStyle = "white"
        ctx.textAlign = "left"
        ctx.textBaseline = "top"

        // 글자 그림자 효과 주기 (텍스트 가독성 확보)
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)"
        ctx.shadowBlur = 12 * textScale
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 4 * textScale

        // 패딩 값 계산 후 텍스트 그리기 (자동 줄바꿈 처리)
        const padding = 24 * textScale
        const maxWidth = outWidth - (padding * 2)
        const words = questionText.split("\n") // 엔터 친 부분 분리
        let currentY = padding

        words.forEach(line => {
          // 화면 너비를 넘어갈 경우를 대비한 안전 가이드라인 라인 렌더링
          ctx.fillText(line, padding, currentY, maxWidth)
          currentY += fontSize * 1.3 // 행간 간격 조절
        })

        // 그림자 효과 초기화 (다음 레이어 영향 방지)
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
              <Image
                src={capturedImage}
                alt="Captured photo"
                fill
                className="object-cover pointer-events-none"
                unoptimized
              />
            )}

            {capturedImage && (strokes.length > 0 || currentStroke.length > 0) && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                <defs>
                  <filter id="mosaicBlur" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="16" />
                  </filter>
                  <filter id="maskSoftEdge">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                  <mask id="brushMask">
                    <rect width="100%" height="100%" fill="black" />
                    {[...strokes, currentStroke].map((stroke, i) => {
                      if (stroke.length === 0) return null
                      if (stroke.length === 1) {
                        return <circle key={i} cx={stroke[0].x} cy={stroke[0].y} r="25" fill="white" filter="url(#maskSoftEdge)" />
                      }
                      const d = `M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`
                      return (
                        <path
                          key={i}
                          d={d}
                          stroke="white"
                          strokeWidth="50"
                          strokeLinecap="square"
                          strokeLinejoin="round"
                          fill="none"
                          filter="url(#maskSoftEdge)"
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
          </div>

          <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
            <button onClick={handleTextIconClick} className={`w-10 h-10 rounded-full flex items-center justify-center ${isTextMode ? "bg-white text-black" : "bg-white/20 text-white"}`}>
              <Type className="w-5 h-5" />
            </button>
            <button onClick={handleMosaicIconClick} className={`w-10 h-10 rounded-full flex items-center justify-center ${isMosaicMode ? "bg-white text-black" : "bg-white/20 text-white"}`}>
              <Droplet className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center pb-12 z-50">
        <button onClick={handleUploadClick} disabled={isUploading} className="px-8 py-3 bg-[#3a3a3a] rounded-full text-white text-sm font-medium disabled:opacity-50">
          업로드
        </button>
      </div>
    </div>
  )
}