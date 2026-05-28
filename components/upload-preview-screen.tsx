"use client"

import { useState, useRef, useEffect } from "react"
import { X, Type, Plus, Eraser, Grip } from "lucide-react"

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

// 텍스트 입력 모달 (등록/취소 위치 교체 완료)
const TextModal = ({ 
  onClose, 
  onRegister, 
  initialValue 
}: { 
  onClose: () => void, 
  onRegister: (text: string) => void,
  initialValue: string
}) => {
  const [text, setText] = useState(initialValue);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
      <div className="bg-white rounded-[40px] w-full max-w-[340px] p-8 flex flex-col items-center shadow-2xl">
        <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-8">궁금한 것을 물어봐요.</h2>
        
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="텍스트를 입력하세요"
          className="w-full h-[56px] border-2 border-[#FF6200] rounded-[20px] px-4 text-center text-[16px] outline-none placeholder:text-[#cccccc] mb-8"
        />
        
        <div className="w-full flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 h-[60px] bg-white border-2 border-[#cccccc] text-[#666666] rounded-[30px] text-[18px] font-bold"
          >
            취소
          </button>
          <button 
            onClick={() => onRegister(text)} 
            className="flex-1 h-[60px] bg-[#FF6200] text-white rounded-[30px] text-[18px] font-bold"
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
};

export function UploadPreviewScreen({ 
  onClose, 
  onUpload,
  capturedImage
}: {
  onClose: () => void
  onUpload: (questionText: string, mergedImage?: string, pollOptions?: string[]) => void
  capturedImage?: string
}) {
  const [questionText, setQuestionText] = useState("")
  const [pollOptions, setPollOptions] = useState<string[]>([])
  const [isMosaicMode, setIsMosaicMode] = useState(false)
  const [isEraserMode, setIsEraserMode] = useState(false)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const [isTextModalOpen, setIsTextModalOpen] = useState(false)
  
  // 컴포넌트 마운트 시 즉시 텍스트 모달 호출 [cite: 5]
  useEffect(() => {
    setIsTextModalOpen(true);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      <div className="p-4 flex justify-between items-center z-50 shrink-0">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center">
          <X className="w-7 h-7 text-white" strokeWidth={1.5} />
        </button>
        <button onClick={() => onUpload(questionText, capturedImage, pollOptions)} className="text-white font-bold px-4">
          완료
        </button>
      </div>

      <div className="flex-1 w-full p-4 flex justify-center items-center relative">
        {/* 기존 이미지 영역 */}
        {capturedImage && <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />}

        {/* 텍스트 디스플레이 영역 */}
        <div className="absolute top-10 left-6 right-6 z-30 cursor-pointer" onClick={() => setIsTextModalOpen(true)}>
          {questionText ? (
            <p className="text-white text-2xl font-bold drop-shadow-xl">{questionText}</p>
          ) : (
            <p className="text-white/50 text-2xl font-bold italic drop-shadow-xl">질문을 입력하세요...</p>
          )}
        </div>

        {/* 툴바 */}
        <div className="absolute right-4 top-1/2 flex flex-col gap-4 z-40">
           <button onClick={() => setIsMosaicMode(!isMosaicMode)} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/20"><Grip className="text-white" /></button>
           <button onClick={() => setIsEraserMode(!isEraserMode)} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/20"><Eraser className="text-white" /></button>
           <button onClick={() => setIsTextModalOpen(true)} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/20"><Type className="text-white" /></button>
           <button onClick={() => setIsPollModalOpen(true)} className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/20"><Plus className="text-white" /></button>
        </div>
      </div>

      {isPollModalOpen && <PollModal onClose={() => setIsPollModalOpen(false)} onRegister={(opts) => { setPollOptions(opts); setIsPollModalOpen(false); }} />}
      {isTextModalOpen && <TextModal onClose={() => setIsTextModalOpen(false)} onRegister={(t) => { setQuestionText(t); setIsTextModalOpen(false); }} initialValue={questionText} />}
    </div>
  )
}