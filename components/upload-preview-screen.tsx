"use client"

import { useState, useRef, useEffect } from "react"
import { X, Type, Plus } from "lucide-react"

// 투표 작성 모달 컴포넌트
const PollModal = ({ onClose, onRegister }: { onClose: () => void, onRegister: (options: string[]) => void }) => {
  const [options, setOptions] = useState<string[]>(["", ""]);

  const addOption = () => {
    if (options.length < 3) setOptions([...options, ""]);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
      <div className="bg-white rounded-[40px] w-full max-w-[340px] p-8 flex flex-col items-center shadow-2xl">
        <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-2">무엇을 투표하시겠어요?</h2>
        <p className="text-[#999999] text-[14px] mb-8">최대 3개까지 선택지를 작성할 수 있습니다</p>
        
        <div className="w-full flex flex-col gap-3 mb-6">
          {options.map((option, index) => (
            <input
              key={index}
              type="text"
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              placeholder="텍스트를 입력하세요"
              className="w-full h-[56px] border-2 border-[#FF6200] rounded-[20px] px-4 text-center text-[16px] outline-none placeholder:text-[#cccccc]"
            />
          ))}
          {options.length < 3 && (
            <button 
              onClick={addOption} 
              className="w-full h-[56px] border-2 border-[#cccccc] rounded-[20px] flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Plus className="text-[#cccccc] w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="w-full flex gap-3">
          <button 
            onClick={() => onRegister(options.filter(opt => opt.trim() !== ""))} 
            className="flex-1 h-[60px] bg-[#FF6200] text-white rounded-[30px] text-[18px] font-bold"
          >
            등록
          </button>
          <button 
            onClick={onClose} 
            className="flex-1 h-[60px] bg-white border-2 border-[#cccccc] text-[#666666] rounded-[30px] text-[18px] font-bold"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

interface UploadPreviewScreenProps {
  onClose: () => void
  onUpload: (questionText: string, mergedImage?: string, pollOptions?: string[]) => void
  capturedImage?: string
}

export function UploadPreviewScreen({ 
  onClose, 
  onUpload,
  capturedImage
}: UploadPreviewScreenProps) {
  const [step, setStep] = useState<"text" | "mosaic">("text")
  const [questionText, setQuestionText] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>([])
  const [isMosaicMode, setIsMosaicMode] = useState(false)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
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

  const handleEditText = () => {
    setStep("text")
  }

  const handleUploadClick = async () => {
    if (isUploading) return

    if (!capturedImage) {
      onUpload(questionText, capturedImage, pollOptions)
      return
    }

    setIsUploading(true)
    try {
      const container = containerRef.current
      if (!container) {
        onUpload(questionText, capturedImage, pollOptions)
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
        onUpload(questionText, capturedImage, pollOptions)
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
      onUpload(questionText, mergedImageData, pollOptions)
    } catch (e) {
      console.error(e)
      onUpload(questionText, capturedImage, pollOptions)
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
      <div className="p-4 flex justify-end items-center z-50 shrink-0">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center">
          <X className="w-7 h-7 text-white" strokeWidth={1.5} />
        </button>
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
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={isMosaicMode ? "stroke-black" : "stroke-white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 21V16M3.5 6V1M1 3.5H6M1 18.5H6M12 2L10.2658 6.50886C9.98381 7.24209 9.84281 7.60871 9.62353 7.91709C9.42919 8.1904 9.1904 8.42919 8.91709 8.62353C8.60871 8.8428 8.24209 8.98381 7.50886 9.26582L3 11L7.50886 12.7342C8.24209 13.0162 8.60871 13.1572 8.91709 13.3765C9.1904 13.5708 9.42919 13.8096 9.62353 14.0829C9.84281 14.3913 9.98381 14.7579 10.2658 15.4911L12 20L13.7342 15.4911C14.0162 14.7579 14.1572 14.3913 14.3765 14.0829C14.5708 13.8096 14.8096 13.5708 15.0829 13.3765C15.3913 13.1572 15.7579 13.0162 16.4911 12.7342L21 11L16.4911 9.26582C15.7579 8.98381 15.3913 8.8428 15.0829 8.62353C14.8096 8.42919 14.5708 8.1904 14.3765 7.91709C14.1572 7.60871 14.0162 7.24209 13.7342 6.50886L12 2Z" />
                </svg>
              </button>

              <button 
                onClick={handleEditText}
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-black/40 backdrop-blur-md text-white border border-white/20"
              >
                <Type className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setIsPollModalOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-black/40 backdrop-blur-md text-white border border-white/20"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 12H5.88197C6.56717 12 7.19357 12.3871 7.5 13C7.80643 13.6129 8.43283 14 9.11803 14H14.882C15.5672 14 16.1936 13.6129 16.5 13C16.8064 12.3871 17.4328 12 18.118 12H21.5M8.96656 4H15.0334C16.1103 4 16.6487 4 17.1241 4.16396C17.5445 4.30896 17.9274 4.5456 18.2451 4.85675C18.6043 5.2086 18.8451 5.6902 19.3267 6.65337L21.4932 10.9865C21.6822 11.3645 21.7767 11.5535 21.8434 11.7515C21.9026 11.9275 21.9453 12.1085 21.971 12.2923C22 12.4992 22 12.7105 22 13.1331V15.2C22 16.8802 22 17.7202 21.673 18.362C21.3854 18.9265 20.9265 19.3854 20.362 19.673C19.7202 20 18.8802 20 17.2 20H6.8C5.11984 20 4.27976 20 3.63803 19.673C3.07354 19.3854 2.6146 18.9265 2.32698 18.362C2 17.7202 2 16.8802 2 15.2V13.1331C2 12.7105 2 12.4992 2.02897 12.2923C2.05471 12.1085 2.09744 11.9275 2.15662 11.7515C2.22326 11.5535 2.31776 11.3645 2.50675 10.9865L4.67331 6.65337C5.1549 5.69019 5.3957 5.2086 5.75495 4.85675C6.07263 4.5456 6.45551 4.30896 6.87589 4.16396C7.35125 4 7.88969 4 8.96656 4Z" />
                </svg>
              </button>
            </div>
          )}

        </div>
      </div>

      {isPollModalOpen && (
        <PollModal 
          onClose={() => setIsPollModalOpen(false)} 
          onRegister={(options) => {
            setPollOptions(options);
            setIsPollModalOpen(false);
          }}
        />
      )}

      <div className="flex justify-center pt-4 pb-8 px-4 z-50 shrink-0">
        {step === "text" ? (
          <button 
            onClick={handleNextStep} 
            disabled={questionText.trim().length === 0}
            className="w-full max-w-[calc(100vw-32px)] py-4 bg-[#FF6200] rounded-full text-white text-base font-bold disabled:opacity-50 shadow-lg"
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