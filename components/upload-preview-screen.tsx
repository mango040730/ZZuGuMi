"use client"

import { useState, useRef } from "react"
import { X, Type, Plus } from "lucide-react"

// 1. 텍스트 입력/수정용 모달
const TextModal = ({ 
  initialText, 
  onClose, 
  onRegister,
  showCancel 
}: { 
  initialText: string, 
  onClose: () => void, 
  onRegister: (text: string) => void,
  showCancel: boolean
}) => {
  const [text, setText] = useState(initialText);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
      <div className="bg-white rounded-[40px] w-full max-w-[340px] p-8 flex flex-col items-center shadow-2xl">
        <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-8">궁금한 것을 물어봐요.</h2>
        
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="텍스트를 입력하세요"
          className="w-full h-[56px] border-2 border-[#FF6200] rounded-[20px] px-4 text-center text-[16px] outline-none placeholder:text-[#cccccc] mb-6"
        />
        
        <div className="w-full flex gap-3">
          {showCancel && (
            <button 
              onClick={onClose} 
              className="flex-1 h-[60px] bg-white border-2 border-[#cccccc] text-[#666666] rounded-[30px] text-[18px] font-bold"
            >
              취소
            </button>
          )}
          <button 
            onClick={() => { if(text.trim()) onRegister(text); }} 
            className="flex-1 h-[60px] bg-[#FF6200] text-white rounded-[30px] text-[18px] font-bold"
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. 투표 작성용 모달
const PollModal = ({ 
  initialOptions, 
  onClose, 
  onRegister 
}: { 
  initialOptions?: string[], 
  onClose: () => void, 
  onRegister: (options: string[]) => void 
}) => {
  const [options, setOptions] = useState<string[]>(
    initialOptions && initialOptions.length > 0 ? initialOptions : ["", ""]
  );

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
            onClick={onClose} 
            className="flex-1 h-[60px] bg-white border-2 border-[#cccccc] text-[#666666] rounded-[30px] text-[18px] font-bold"
          >
            취소
          </button>
          <button 
            onClick={() => onRegister(options.filter(opt => opt.trim() !== ""))} 
            className="flex-1 h-[60px] bg-[#FF6200] text-white rounded-[30px] text-[18px] font-bold"
          >
            등록
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
  const [isEraserMode, setIsEraserMode] = useState(false)
  
  // 모달 상태 관리
  const [isTextModalOpen, setIsTextModalOpen] = useState(true)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  
  const [strokes, setStrokes] = useState<{x: number, y: number}[][]>([])
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([])
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMosaicIconClick = () => {
    setIsMosaicMode(prev => !prev)
    setIsEraserMode(false)
  }

  const handleEraserIconClick = () => {
    setIsEraserMode(prev => !prev)
    setIsMosaicMode(false)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (step !== "mosaic" || (!isMosaicMode && !isEraserMode)) return
    setIsPointerDown(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isMosaicMode) {
      setCurrentStroke([{ x, y }])
    } else if (isEraserMode) {
      setStrokes(prev => prev.filter(stroke => !stroke.some(p => Math.hypot(p.x - x, p.y - y) < 30)))
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown || step !== "mosaic") return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isMosaicMode) {
      setCurrentStroke(prev => [...prev, { x, y }])
    } else if (isEraserMode) {
      setStrokes(prev => prev.filter(stroke => !stroke.some(p => Math.hypot(p.x - x, p.y - y) < 30)))
    }
  }

  const handlePointerUp = () => {
    setIsPointerDown(false)
    if (isMosaicMode && currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke])
      setCurrentStroke([])
    }
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
      const outWidth = img.width
      const outHeight = img.height
      const canvas = document.createElement("canvas")
      canvas.width = outWidth
      canvas.height = outHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        onUpload(questionText, capturedImage, pollOptions)
        return
      }

      ctx.drawImage(img, 0, 0, outWidth, outHeight)

      if (strokes.length > 0 || currentStroke.length > 0) {
        const strokeScale = outWidth / clientWidth
        const allStrokes = currentStroke.length > 0 ? [...strokes, currentStroke] : strokes

        // Blur via multi-step downsample → smooth upsample (works on all browsers including iOS Safari)
        const blurFactor = Math.max(4, Math.round(20 * strokeScale))
        const smallW = Math.max(1, Math.round(outWidth / blurFactor))
        const smallH = Math.max(1, Math.round(outHeight / blurFactor))

        const smallCanvas = document.createElement("canvas")
        smallCanvas.width = smallW
        smallCanvas.height = smallH
        const smallCtx = smallCanvas.getContext("2d")

        const mosaicCanvas = document.createElement("canvas")
        mosaicCanvas.width = outWidth
        mosaicCanvas.height = outHeight
        const mosaicCtx = mosaicCanvas.getContext("2d")

        if (smallCtx && mosaicCtx) {
          smallCtx.imageSmoothingEnabled = true
          smallCtx.imageSmoothingQuality = "high"
          smallCtx.drawImage(img, 0, 0, outWidth, outHeight, 0, 0, smallW, smallH)

          // smooth upsample → blur effect (not pixelation)
          mosaicCtx.imageSmoothingEnabled = true
          mosaicCtx.imageSmoothingQuality = "high"
          mosaicCtx.drawImage(smallCanvas, 0, 0, outWidth, outHeight)

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
                for (let i = 1; i < stroke.length; i++) maskCtx.lineTo(stroke[i].x * strokeScale, stroke[i].y * strokeScale)
                maskCtx.stroke()
              }
            })
            maskCtx.shadowColor = "transparent"
            maskCtx.shadowBlur = 0
            maskCtx.globalCompositeOperation = "source-in"
            maskCtx.drawImage(mosaicCanvas, 0, 0)
            ctx.globalCompositeOperation = "source-over"
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
        <div ref={containerRef} className={`relative h-full max-h-[75vh] aspect-[22/29] bg-zinc-900 rounded-[12px] overflow-hidden shrink-0 ${step === "mosaic" && (isMosaicMode || isEraserMode) ? "touch-none cursor-crosshair" : ""}`}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
          {capturedImage && <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />}

          {capturedImage && (strokes.length > 0 || currentStroke.length > 0) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <defs>
                <filter id="mosaicBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16" /></filter>
                <mask id="brushMask">
                  <rect width="100%" height="100%" fill="black" />
                  {[...strokes, currentStroke].map((stroke, i) => {
                    if (stroke.length === 0) return null
                    if (stroke.length === 1) return <circle key={i} cx={stroke[0].x} cy={stroke[0].y} r="25" fill="white" />
                    return <path key={i} d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`} stroke="white" strokeWidth="50" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  })}
                </mask>
              </defs>
              <image href={capturedImage} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" filter="url(#mosaicBlur)" mask="url(#brushMask)" />
            </svg>
          )}
          
          <div className="absolute top-0 left-0 right-0 p-6 flex flex-col z-30 pointer-events-none">
            <div className="w-full text-white text-2xl sm:text-3xl font-bold drop-shadow-xl whitespace-pre-wrap">{questionText}</div>
          </div>

          {step === "mosaic" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={handleMosaicIconClick} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${isMosaicMode ? "bg-white text-black" : "bg-black/40 backdrop-blur-md text-white border border-white/20"}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={isMosaicMode ? "stroke-black" : "stroke-white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.4 3H4.6C4.03995 3 3.75992 3 3.54601 3.10899C3.35785 3.20487 3.20487 3.35785 3.10899 3.54601C3 3.75992 3 4.03995 3 4.6V8.4C3 8.96005 3 9.24008 3.10899 9.45399C3.20487 9.64215 3.35785 9.79513 3.54601 9.89101C3.75992 10 4.03995 10 4.6 10H8.4C8.96005 10 9.24008 10 9.45399 9.89101C9.64215 9.79513 9.79513 9.64215 9.89101 9.45399C10 9.24008 10 8.96005 10 8.4V4.6C10 4.03995 10 3.75992 9.89101 3.54601C9.79513 3.35785 9.64215 3.20487 9.45399 3.10899C9.24008 3 8.96005 3 8.4 3Z"/>
                  <path d="M19.4 3H15.6C15.0399 3 14.7599 3 14.546 3.10899C14.3578 3.20487 14.2049 3.35785 14.109 3.54601C14 3.75992 14 4.03995 14 4.6V8.4C14 8.96005 14 9.24008 14.109 9.45399C14.2049 9.64215 14.3578 9.79513 14.546 9.89101C14.7599 10 15.0399 10 15.6 10H19.4C19.9601 10 20.2401 10 20.454 9.89101C20.6422 9.79513 20.7951 9.64215 20.891 9.45399C21 9.24008 21 8.96005 21 8.4V4.6C21 4.03995 21 3.75992 20.891 3.54601C20.7951 3.35785 20.6422 3.20487 20.454 3.10899C20.2401 3 19.9601 3 19.4 3Z"/>
                  <path d="M19.4 14H15.6C15.0399 14 14.7599 14 14.546 14.109C14.3578 14.2049 14.2049 14.3578 14.109 14.546C14 14.7599 14 15.0399 14 15.6V19.4C14 19.9601 14 20.2401 14.109 20.454C14.2049 20.6422 14.3578 20.7951 14.546 20.891C14.7599 21 15.0399 21 15.6 21H19.4C19.9601 21 20.2401 21 20.454 20.891C20.6422 20.7951 20.7951 20.6422 20.891 20.454C21 20.2401 21 19.9601 21 19.4V15.6C21 15.0399 21 14.7599 20.891 14.546C20.7951 14.3578 20.6422 14.2049 20.454 14.109C20.2401 14 19.9601 14 19.4 14Z"/>
                  <path d="M8.4 14H4.6C4.03995 14 3.75992 14 3.54601 14.109C3.35785 14.2049 3.20487 14.3578 3.10899 14.546C3 14.7599 3 15.0399 3 15.6V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H8.4C8.96005 21 9.24008 21 9.45399 20.891C9.64215 20.7951 9.79513 20.6422 9.89101 20.454C10 20.2401 10 19.9601 10 19.4V15.6C10 15.0399 10 14.7599 9.89101 14.546C9.79513 14.3578 9.64215 14.2049 9.45399 14.109C9.24008 14 8.96005 14 8.4 14Z"/>
                </svg>
              </button>
              <button onClick={handleEraserIconClick} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${isEraserMode ? "bg-white" : "bg-black/40 backdrop-blur-md border border-white/20"}`}>
                <svg width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.7574 11.7574L9.75736 4.75736M19.7574 19.7574H6.75736M9.69462 18.8201L18.3632 10.1515C19.5513 8.96342 20.1453 8.3694 20.3679 7.68441C20.5637 7.08188 20.5637 6.43284 20.3679 5.83031C20.1453 5.14532 19.5513 4.5513 18.3632 3.36325L18.1515 3.15147C16.9634 1.96342 16.3694 1.3694 15.6844 1.14683C15.0819 0.951057 14.4328 0.951057 13.8303 1.14683C13.1453 1.3694 12.5513 1.96342 11.3632 3.15147L3.15147 11.3632C1.96342 12.5513 1.3694 13.1453 1.14683 13.8303C0.951057 14.4328 0.951057 15.0819 1.14683 15.6844C1.3694 16.3694 1.96342 16.9634 3.15147 18.1515L3.8201 18.8201C4.166 19.166 4.33896 19.339 4.54079 19.4626C4.71973 19.5723 4.91482 19.6531 5.1189 19.7021C5.34907 19.7574 5.59366 19.7574 6.08284 19.7574H7.43188C7.92106 19.7574 8.16565 19.7574 8.39582 19.7021C8.5999 19.6531 8.79498 19.5723 8.97393 19.4626C9.17576 19.339 9.34871 19.166 9.69462 18.8201Z" stroke={isEraserMode ? "#262626" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              
              <button onClick={() => setIsTextModalOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-black/40 backdrop-blur-md text-white border border-white/20">
                <Type className="w-5 h-5" />
              </button>
              
              <button onClick={() => setIsPollModalOpen(true)} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-black/40 backdrop-blur-md text-white border border-white/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12H5.88197C6.56717 12 7.19357 12.3871 7.5 13C7.80643 13.6129 8.43283 14 9.11803 14H14.882C15.5672 14 16.1936 13.6129 16.5 13C16.8064 12.3871 17.4328 12 18.118 12H21.5M8.96656 4H15.0334C16.1103 4 16.6487 4 17.1241 4.16396C17.5445 4.30896 17.9274 4.5456 18.2451 4.85675C18.6043 5.2086 18.8451 5.6902 19.3267 6.65337L21.4932 10.9865C21.6822 11.3645 21.7767 11.5535 21.8434 11.7515C21.9026 11.9275 21.9453 12.1085 21.971 12.2923C22 12.4992 22 12.7105 22 13.1331V15.2C22 16.8802 22 17.7202 21.673 18.362C21.3854 18.9265 20.9265 19.3854 20.362 19.673C19.7202 20 18.8802 20 17.2 20H6.8C5.11984 20 4.27976 20 3.63803 19.673C3.07354 19.3854 2.6146 18.9265 2.32698 18.362C2 17.7202 2 16.8802 2 15.2V13.1331C2 12.7105 2 12.4992 2.02897 12.2923C2.05471 12.1085 2.09744 11.9275 2.15662 11.7515C2.22326 11.5535 2.31776 11.3645 2.50675 10.9865L4.67331 6.65337C5.1549 5.69019 5.3957 5.2086 5.75495 4.85675C6.07263 4.5456 6.45551 4.30896 6.87589 4.16396C7.35125 4 7.88969 4 8.96656 4Z" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 텍스트 입력/수정 모달 */}
      {isTextModalOpen && (
        <TextModal 
          initialText={questionText}
          showCancel={step === "mosaic"} // 현재 step에 따라 취소 버튼 표시 여부 제어
          onClose={() => { 
            setIsTextModalOpen(false); 
            setStep("mosaic");
          }} 
          onRegister={(text) => { 
            setQuestionText(text); 
            setIsTextModalOpen(false); 
            setStep("mosaic");
          }} 
        />
      )}

      {/* 투표 선택지 입력 모달 */}
      {isPollModalOpen && (
        <PollModal 
          initialOptions={pollOptions}
          onClose={() => setIsPollModalOpen(false)} 
          onRegister={(options) => { 
            setPollOptions(options); 
            setIsPollModalOpen(false); 
          }} 
        />
      )}

      <div className="flex justify-center pt-4 pb-8 px-4 z-50 shrink-0">
        <button 
          onClick={handleUploadClick} 
          disabled={isUploading} 
          className="w-full max-w-[calc(100vw-32px)] py-4 bg-[#FF6200] rounded-full text-white text-base font-bold disabled:opacity-50 shadow-lg hover:bg-[#e55800] transition-colors"
        >
          업로드
        </button>
      </div>
    </div>
  )
}