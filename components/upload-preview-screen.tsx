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
  
  // 모드 상태: 모자이크 그리기 vs 지우기
  const [mode, setMode] = useState<"mosaic" | "erase">("mosaic")
  
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const [strokes, setStrokes] = useState<{x: number, y: number}[][]>([])
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([])
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleNextStep = () => {
    if (questionText.trim().length > 0) setStep("mosaic")
  }

  const handleEditText = () => setStep("text")

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

      const img = new window.Image()
      img.crossOrigin = "anonymous"
      await new Promise((resolve, reject) => {
        img.onload = resolve; img.onerror = reject; img.src = capturedImage
      })

      const { clientWidth } = container
      const outWidth = 880, outHeight = 1160
      const canvas = document.createElement("canvas")
      canvas.width = outWidth; canvas.height = outHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) { onUpload(questionText, capturedImage, pollOptions); return }

      const scale = Math.max(outWidth / img.width, outHeight / img.height)
      const sw = outWidth / scale, sh = outHeight / scale
      const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight)

      if (strokes.length > 0) {
        const strokeScale = outWidth / clientWidth
        const blurCanvas = document.createElement("canvas")
        blurCanvas.width = outWidth; blurCanvas.height = outHeight
        const blurCtx = blurCanvas.getContext("2d")
        if (blurCtx) {
          blurCtx.filter = `blur(${16 * strokeScale}px)`
          blurCtx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outHeight)
          
          const maskCanvas = document.createElement("canvas")
          maskCanvas.width = outWidth; maskCanvas.height = outHeight
          const maskCtx = maskCanvas.getContext("2d")
          if (maskCtx) {
            maskCtx.strokeStyle = "black"; maskCtx.lineWidth = 50 * strokeScale
            maskCtx.lineCap = "round"; maskCtx.lineJoin = "round"
            strokes.forEach(stroke => {
              maskCtx.beginPath()
              maskCtx.moveTo(stroke[0].x * strokeScale, stroke[0].y * strokeScale)
              stroke.forEach(p => maskCtx.lineTo(p.x * strokeScale, p.y * strokeScale))
              maskCtx.stroke()
            })
            maskCtx.globalCompositeOperation = "source-in"
            maskCtx.drawImage(blurCanvas, 0, 0)
            ctx.drawImage(maskCanvas, 0, 0)
          }
        }
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
          className="relative h-full max-h-[75vh] aspect-[22/29] bg-zinc-900 rounded-3xl overflow-hidden shrink-0 touch-none"
          onPointerDown={(e) => {
            if (step === "mosaic") {
              setIsPointerDown(true)
              const rect = e.currentTarget.getBoundingClientRect()
              const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
              if (mode === "mosaic") {
                setCurrentStroke([point])
              } else {
                setStrokes(prev => prev.filter(stroke => !stroke.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 30)))
              }
            }
          }}
          onPointerMove={(e) => {
            if (step === "mosaic" && isPointerDown) {
              const rect = e.currentTarget.getBoundingClientRect()
              const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
              if (mode === "mosaic") {
                setCurrentStroke(prev => [...prev, point])
              } else {
                setStrokes(prev => prev.filter(stroke => !stroke.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 30)))
              }
            }
          }}
          onPointerUp={() => {
            if (step === "mosaic" && mode === "mosaic" && isPointerDown) {
              setIsPointerDown(false)
              if (currentStroke.length > 0) setStrokes(prev => [...prev, currentStroke])
              setCurrentStroke([])
            }
          }}
        >
          {capturedImage && <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />}

          {step === "mosaic" && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <mask id="brushMask">
                <rect width="100%" height="100%" fill="black" />
                {strokes.concat(currentStroke.length ? [currentStroke] : []).map((stroke, i) => (
                  <path key={i} d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`} stroke="white" strokeWidth="50" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                ))}
              </mask>
              <image href={capturedImage} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" filter="url(#mosaicBlur)" mask="url(#brushMask)" />
            </svg>
          )}

          {step === "text" && <div className="absolute inset-0 bg-black/40 z-20" />}
          {(step === "text" || questionText.length > 0) && (
            <div className="absolute top-0 left-0 right-0 p-6 z-30">
              {step === "text" ? (
                <textarea ref={textareaRef} value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="궁금한 점을 적어보세요" className="w-full bg-transparent text-white text-3xl font-bold resize-none outline-none" rows={1} />
              ) : <div className="text-white text-3xl font-bold whitespace-pre-wrap">{questionText}</div>}
            </div>
          )}

          {step === "mosaic" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
              <button onClick={() => setMode(mode === "mosaic" ? "erase" : "mosaic")} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${mode === "erase" ? "bg-white" : "bg-black/40 backdrop-blur-md"}`}>
                {mode === "mosaic" ? (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 21V16M3.5 6V1M1 3.5H6M1 18.5H6M12 2L10.2658 6.50886C9.98381 7.24209 9.84281 7.60871 9.62353 7.91709C9.42919 8.1904 8.91709 8.62353C8.60871 8.8428 8.24209 8.98381 7.50886 9.26582L3 11L7.50886 12.7342C8.24209 13.0162 8.60871 13.1572 8.91709 13.3765C9.1904 13.5708 9.42919 13.8096 9.62353 14.0829C9.84281 14.3913 9.98381 14.7579 10.2658 15.4911L12 20L13.7342 15.4911C14.0162 14.7579 14.1572 14.3913 14.3765 14.0829C14.5708 13.8096 14.8096 13.5708 15.0829 13.3765C15.3913 13.1572 15.7579 13.0162 16.4911 12.7342L21 11L16.4911 9.26582C15.7579 8.98381 15.3913 8.8428 15.0829 8.62353C14.8096 8.42919 14.5708 8.1904 14.3765 7.91709C14.1572 7.60871 14.0162 7.24209 13.7342 6.50886L12 2Z"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" className="stroke-black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.9995 13L10.9995 6.00004M20.9995 21H7.99955M10.9368 20.0628L19.6054 11.3941C20.7935 10.2061 21.3875 9.61207 21.6101 8.92709C21.8058 8.32456 21.8058 7.67551 21.6101 7.07298C21.3875 6.388 20.7935 5.79397 19.6054 4.60592L19.3937 4.39415C18.2056 3.2061 17.6116 2.61207 16.9266 2.38951C16.3241 2.19373 15.675 2.19373 15.0725 2.38951C14.3875 2.61207 13.7935 3.2061 12.6054 4.39415L4.39366 12.6059C3.20561 13.794 2.61158 14.388 2.38902 15.073C2.19324 15.6755 2.19324 16.3246 2.38902 16.9271C2.61158 17.6121 3.20561 18.2061 4.39366 19.3941L5.06229 20.0628C5.40819 20.4087 5.58114 20.5816 5.78298 20.7053C5.96192 20.815 6.15701 20.8958 6.36108 20.9448C6.59126 21 6.83585 21 7.32503 21H8.67406C9.16324 21 9.40784 21 9.63801 20.9448C9.84208 20.8958 10.0372 20.815 10.2161 20.7053C10.418 20.5816 10.5909 20.4087 10.9368 20.0628Z"/></svg>
                )}
              </button>
              <button onClick={handleEditText} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-black/40 backdrop-blur-md"><Type className="w-5 h-5 text-white" /></button>
              <button onClick={() => setIsPollModalOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-black/40 backdrop-blur-md"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12H5.88197C6.56717 12 7.19357 12.3871 7.5 13C7.80643 13.6129 8.43283 14 9.11803 14H14.882C15.5672 14 16.1936 13.6129 16.5 13C16.8064 12.3871 17.4328 12 18.118 12H21.5M8.96656 4H15.0334C16.1103 4 16.6487 4 17.1241 4.16396C17.5445 4.30896 17.9274 4.5456 18.2451 4.85675C18.6043 5.2086 18.8451 5.6902 19.3267 6.65337L21.4932 10.9865C21.6822 11.3645 21.7767 11.5535 21.8434 11.7515C21.9026 11.9275 21.9453 12.1085 21.971 12.2923C22 12.4992 22 12.7105 22 13.1331V15.2C22 16.8802 22 17.7202 21.673 18.362C21.3854 18.9265 20.9265 19.3854 20.362 19.673C19.7202 20 18.8802 20 17.2 20H6.8C5.11984 20 4.27976 20 3.63803 19.673C3.07354 19.3854 2.6146 18.9265 2.32698 18.362C2 17.7202 2 16.8802 2 15.2V13.1331C2 12.7105 2 12.4992 2.02897 12.2923C2.05471 12.1085 2.09744 11.9275 2.15662 11.7515C2.22326 11.5535 2.31776 11.3645 2.50675 10.9865L4.67331 6.65337C5.1549 5.69019 5.3957 5.2086 5.75495 4.85675C6.07263 4.5456 6.45551 4.30896 6.87589 4.16396C7.35125 4 7.88969 4 8.96656 4Z"/></svg></button>
            </div>
          )}
        </div>
      </div>

      {isPollModalOpen && <PollModal onClose={() => setIsPollModalOpen(false)} onRegister={(options) => { setPollOptions(options); setIsPollModalOpen(false); }} />}

      <div className="flex justify-center pt-4 pb-8 px-4 z-50 shrink-0">
        <button onClick={step === "text" ? handleNextStep : handleUploadClick} disabled={isUploading || (step === "text" && questionText.trim().length === 0)} className="w-full max-w-[calc(100vw-32px)] py-4 bg-[#FF6200] rounded-full text-white text-base font-bold shadow-lg">
          {step === "text" ? "다음" : "업로드"}
        </button>
      </div>
    </div>
  )
}