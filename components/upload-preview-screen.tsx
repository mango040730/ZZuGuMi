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
  const [step, setStep] = useState<"text" | "mosaic">("text")
  const [questionText, setQuestionText] = useState("")
  const [isMosaicMode, setIsMosaicMode] = useState(false)
  const [showVoteModal, setShowVoteModal] = useState(false) // 투표 모달 상태 추가
  const [strokes, setStrokes] = useState<{x: number, y: number}[][]>([])
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([])
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMosaicIconClick = () => setIsMosaicMode(prev => !prev)
  const handleNextStep = () => { if (questionText.trim().length > 0) setStep("mosaic") }
  const handleEditText = () => setStep("text")

  const handleUploadClick = async () => {
    if (isUploading || !capturedImage) return
    setIsUploading(true)
    try {
      const container = containerRef.current
      if (!container) return

      const img = new Image()
      img.crossOrigin = "anonymous"
      await new Promise((resolve) => { img.onload = resolve; img.src = capturedImage })

      const outWidth = 880, outHeight = 1160
      const canvas = document.createElement("canvas")
      canvas.width = outWidth; canvas.height = outHeight
      const ctx = canvas.getContext("2d")!

      const scale = Math.max(outWidth / img.width, outHeight / img.height)
      ctx.drawImage(img, (img.width - outWidth/scale)/2, (img.height - outHeight/scale)/2, outWidth/scale, outHeight/scale, 0, 0, outWidth, outHeight)

      if (strokes.length > 0 || currentStroke.length > 0) {
        const strokeScale = outWidth / container.clientWidth
        const allStrokes = [...strokes, currentStroke].filter(s => s.length > 0)

        const blurCanvas = document.createElement("canvas")
        blurCanvas.width = outWidth; blurCanvas.height = outHeight
        const blurCtx = blurCanvas.getContext("2d")!
        blurCtx.filter = `blur(${16 * strokeScale}px)`
        blurCtx.drawImage(img, (img.width - outWidth/scale)/2, (img.height - outHeight/scale)/2, outWidth/scale, outHeight/scale, 0, 0, outWidth, outHeight)
        
        const maskCanvas = document.createElement("canvas")
        maskCanvas.width = outWidth; maskCanvas.height = outHeight
        const maskCtx = maskCanvas.getContext("2d")!
        maskCtx.lineWidth = 50 * strokeScale
        maskCtx.lineCap = "round"; maskCtx.lineJoin = "round"
        
        allStrokes.forEach(stroke => {
          maskCtx.beginPath()
          maskCtx.moveTo(stroke[0].x * strokeScale, stroke[0].y * strokeScale)
          stroke.forEach(p => maskCtx.lineTo(p.x * strokeScale, p.y * strokeScale))
          maskCtx.stroke()
        })

        maskCtx.globalCompositeOperation = "source-in"
        maskCtx.drawImage(blurCanvas, 0, 0)
        ctx.drawImage(maskCanvas, 0, 0)
      }

      onUpload(questionText, canvas.toDataURL("image/jpeg", 0.9))
    } catch (e) {
      console.error(e)
      onUpload(questionText, capturedImage)
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
          className={`relative h-full max-h-[75vh] aspect-[22/29] bg-zinc-900 rounded-3xl overflow-hidden shrink-0 ${step === "mosaic" && isMosaicMode ? "touch-none cursor-crosshair" : ""}`}
          onPointerDown={(e) => { if (step === "mosaic" && isMosaicMode) { setIsPointerDown(true); const r = e.currentTarget.getBoundingClientRect(); setCurrentStroke([{ x: e.clientX - r.left, y: e.clientY - r.top }]) } }}
          onPointerMove={(e) => { if (isPointerDown) { const r = e.currentTarget.getBoundingClientRect(); setCurrentStroke(prev => [...prev, { x: e.clientX - r.left, y: e.clientY - r.top }]) } }}
          onPointerUp={() => { if (isPointerDown) { setIsPointerDown(false); if (currentStroke.length > 0) { setStrokes(prev => [...prev, currentStroke]); setCurrentStroke([]) } } }}
        >
          {capturedImage && <img src={capturedImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />}
          {step === "mosaic" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={handleMosaicIconClick} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${isMosaicMode ? "bg-white text-black" : "bg-black/40 text-white border border-white/20"}`}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3.5 21V16M3.5 6V1M1 3.5H6M1 18.5H6M12 2L10.2658 6.50886C9.98381 7.24209 9.84281 7.60871 9.62353 7.91709C9.42919 8.1904 9.1904 8.42919 8.91709 8.62353C8.60871 8.8428 8.24209 8.98381 7.50886 9.26582L3 11L7.50886 12.7342C8.24209 13.0162 8.60871 13.1572 8.91709 13.3765C9.1904 13.5708 9.42919 13.8096 9.62353 14.0829C9.84281 14.3913 9.98381 14.7579 10.2658 15.4911L12 20L13.7342 15.4911C14.0162 14.7579 14.1572 14.3913 14.3765 14.0829C14.5708 13.8096 14.8096 13.5708 15.0829 13.3765C15.3913 13.1572 15.7579 13.0162 16.4911 12.7342L21 11L16.4911 9.26582C15.7579 8.98381 15.3913 8.8428 15.0829 8.62353C14.8096 8.42919 14.5708 8.1904 14.3765 7.91709C14.1572 7.60871 14.0162 7.24209 13.7342 6.50886L12 2Z" /></svg>
              </button>
              <button onClick={() => setShowVoteModal(true)} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-black/40 text-white border border-white/20">
                <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 9H4.88197C5.56717 9 6.19357 9.38713 6.5 10C6.80643 10.6129 7.43283 11 8.11803 11H13.882C14.5672 11 15.1936 10.6129 15.5 10C15.8064 9.38713 16.4328 9 17.118 9H20.5M7.96656 1H14.0334C15.1103 1 15.6487 1 16.1241 1.16396C16.5445 1.30896 16.9274 1.5456 17.2451 1.85675C17.6043 2.2086 17.8451 2.6902 18.3267 3.65337L20.4932 7.9865C20.6822 8.36449 20.7767 8.55348 20.8434 8.75155C20.9026 8.92745 20.9453 9.10847 20.971 9.29226C21 9.49923 21 9.71053 21 10.1331V12.2C21 13.8802 21 14.7202 20.673 15.362C20.3854 15.9265 19.9265 16.3854 19.362 16.673C18.7202 17 17.8802 17 16.2 17H5.8C4.11984 17 3.27976 17 2.63803 16.673C2.07354 16.3854 1.6146 15.9265 1.32698 15.362C1 14.7202 1 13.8802 1 12.2V10.1331C1 9.71053 1 9.49923 1.02897 9.29226C1.05471 9.10847 1.09744 8.92745 1.15662 8.75155C1.22326 8.55348 1.31776 8.36448 1.50675 7.9865L3.67331 3.65337C4.1549 2.69019 4.3957 2.2086 4.75495 1.85675C5.07263 1.5456 5.45551 1.30896 5.87589 1.16396C6.35125 1 6.88969 1 7.96656 1Z"/></svg>
              </button>
              <button onClick={handleEditText} className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-black/40 text-white border border-white/20"><Type className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      </div>

      {showVoteModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-6">
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-white/10">
            <h2 className="text-white text-xl font-bold mb-4">투표 만들기</h2>
            <input placeholder="투표 질문을 입력하세요" className="w-full bg-zinc-800 text-white p-3 rounded-lg mb-4 outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowVoteModal(false)} className="flex-1 py-3 bg-zinc-700 text-white rounded-full font-bold">취소</button>
              <button onClick={() => setShowVoteModal(false)} className="flex-1 py-3 bg-[#FF6200] text-white rounded-full font-bold">완료</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4 pb-8 px-4 z-50 shrink-0">
        <button onClick={step === "text" ? handleNextStep : handleUploadClick} className="w-full max-w-[calc(100vw-32px)] py-4 bg-[#FF6200] rounded-full text-white text-base font-bold shadow-lg">
          {step === "text" ? "다음" : "업로드"}
        </button>
      </div>
    </div>
  )
}