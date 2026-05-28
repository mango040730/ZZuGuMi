"use client"

import { useState, useRef, useEffect } from "react"
import { X, Type, Plus, Eraser, Grip } from "lucide-react"

// 투표 작성 모달 컴포넌트
const PollModal = ({ onClose, onRegister }: { onClose: () => void, onRegister: (options: string[]) => void }) => {
  const [options, setOptions] = useState<string[]>(["", ""]);
  const addOption = () => { if (options.length < 3) setOptions([...options, ""]); };
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
      <div className="bg-white rounded-[40px] w-full max-w-[340px] p-8 flex flex-col items-center shadow-2xl">
        <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-2">무엇을 투표하시겠어요?</h2>
        <div className="w-full flex flex-col gap-3 mb-6">
          {options.map((option, index) => (
            <input key={index} type="text" value={option} onChange={(e) => handleOptionChange(index, e.target.value)} placeholder="텍스트를 입력하세요" className="w-full h-[56px] border-2 border-[#FF6200] rounded-[20px] px-4 text-center text-[16px] outline-none" />
          ))}
          {options.length < 3 && (
            <button onClick={addOption} className="w-full h-[56px] border-2 border-[#cccccc] rounded-[20px] flex items-center justify-center"><Plus className="text-[#cccccc] w-6 h-6" /></button>
          )}
        </div>
        <div className="w-full flex gap-3">
          <button onClick={onClose} className="flex-1 h-[60px] bg-white border-2 border-[#cccccc] text-[#666666] rounded-[30px] text-[18px] font-bold">취소</button>
          <button onClick={() => onRegister(options.filter(opt => opt.trim() !== ""))} className="flex-1 h-[60px] bg-[#FF6200] text-white rounded-[30px] text-[18px] font-bold">등록</button>
        </div>
      </div>
    </div>
  );
};

// 텍스트 입력 모달
const TextModal = ({ onClose, onRegister, initialValue }: { onClose: () => void, onRegister: (text: string) => void, initialValue: string }) => {
  const [text, setText] = useState(initialValue);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
      <div className="bg-white rounded-[40px] w-full max-w-[340px] p-8 flex flex-col items-center shadow-2xl">
        <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-8">궁금한 것을 물어봐요.</h2>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="텍스트를 입력하세요" className="w-full h-[56px] border-2 border-[#FF6200] rounded-[20px] px-4 text-center text-[16px] outline-none mb-8" />
        <div className="w-full flex gap-3">
          <button onClick={onClose} className="flex-1 h-[60px] bg-white border-2 border-[#cccccc] text-[#666666] rounded-[30px] text-[18px] font-bold">취소</button>
          <button onClick={() => onRegister(text)} className="flex-1 h-[60px] bg-[#FF6200] text-white rounded-[30px] text-[18px] font-bold">등록</button>
        </div>
      </div>
    </div>
  );
};

export function UploadPreviewScreen({ onClose, onUpload, capturedImage }: any) {
  const [questionText, setQuestionText] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>([])
  const [isMosaicMode, setIsMosaicMode] = useState(false)
  const [isEraserMode, setIsEraserMode] = useState(false)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const [isTextModalOpen, setIsTextModalOpen] = useState(false)
  
  // 모자이크 기능 관련 상태
  const [strokes, setStrokes] = useState<{x: number, y: number}[][]>([])
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([])
  const [isPointerDown, setIsPointerDown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 진입 시 바로 텍스트 모달 표시
  useEffect(() => { setIsTextModalOpen(true); }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isMosaicMode && !isEraserMode) return
    setIsPointerDown(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (isMosaicMode) setCurrentStroke([{ x, y }])
    else if (isEraserMode) setStrokes(prev => prev.filter(stroke => !stroke.some(p => Math.hypot(p.x - x, p.y - y) < 30)))
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (isMosaicMode) setCurrentStroke(prev => [...prev, { x, y }])
    else if (isEraserMode) setStrokes(prev => prev.filter(stroke => !stroke.some(p => Math.hypot(p.x - x, p.y - y) < 30)))
  }

  const handlePointerUp = () => {
    setIsPointerDown(false)
    if (isMosaicMode && currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke])
      setCurrentStroke([])
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      <div className="p-4 flex justify-between items-center z-50">
        <button onClick={onClose}><X className="w-7 h-7 text-white" /></button>
        <button onClick={() => onUpload(questionText, capturedImage, pollOptions)} className="text-white font-bold">완료</button>
      </div>

      <div className="flex-1 w-full p-4 flex justify-center items-center relative touch-none" 
           ref={containerRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        
        {capturedImage && <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />}
        
        {/* 텍스트 영역 */}
        <div className="absolute top-10 left-6 right-6 z-30 cursor-pointer" onClick={() => setIsTextModalOpen(true)}>
          {questionText ? <p className="text-white text-2xl font-bold">{questionText}</p> : <p className="text-white/50 text-2xl font-bold italic">질문을 입력하세요...</p>}
        </div>

        {/* 툴바 (수정된 아이콘) */}
        <div className="absolute right-4 top-1/2 flex flex-col gap-4 z-40">
           <button onClick={() => { setIsMosaicMode(!isMosaicMode); setIsEraserMode(false); }} className={`p-3 rounded-full ${isMosaicMode ? "bg-white text-black" : "bg-black/40 text-white"}`}><Grip className="w-6 h-6" /></button>
           <button onClick={() => { setIsEraserMode(!isEraserMode); setIsMosaicMode(false); }} className={`p-3 rounded-full ${isEraserMode ? "bg-white text-black" : "bg-black/40 text-white"}`}><Eraser className="w-6 h-6" /></button>
           <button onClick={() => setIsTextModalOpen(true)} className="p-3 bg-black/40 text-white rounded-full"><Type className="w-6 h-6" /></button>
           <button onClick={() => setIsPollModalOpen(true)} className="p-3 bg-black/40 text-white rounded-full"><Plus className="w-6 h-6" /></button>
        </div>
      </div>

      {isPollModalOpen && <PollModal onClose={() => setIsPollModalOpen(false)} onRegister={(opts) => { setPollOptions(opts); setIsPollModalOpen(false); }} />}
      {isTextModalOpen && <TextModal onClose={() => setIsTextModalOpen(false)} onRegister={(t) => { setQuestionText(t); setIsTextModalOpen(false); }} initialValue={questionText} />}
    </div>
  )
}