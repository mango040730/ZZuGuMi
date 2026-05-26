// components/home/floating-cards.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { X, ThumbsUp, ThumbsDown } from "lucide-react"

export interface Post {
  id: string
  imageData: string
  questionText: string
  createdAt: number
}

interface FloatingCardsProps {
  userPosts?: Post[]
}

export function FloatingCards({ userPosts = [] }: FloatingCardsProps) {
  // 3D 터널 탐색용 스크롤 좌표 및 부드러운 감쇠(Lerp) 좌표 시스템
  const [smoothScrollY, setSmoothScrollY] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const scrollYRef = useRef(0)
  const smoothScrollYRef = useRef(0)

  // 📝 피드백 페이지 모드 상태 관리
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [feedbackQueue, setFeedbackQueue] = useState<Post[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const [showTutorial, setShowTutorial] = useState(true)

  // 🖐️ 스와이프 물리 좌표 및 드래그 상태
  const [dragStartX, setDragStartX] = useState(0)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeOutDirection, setSwipeOutDirection] = useState<"left" | "right" | null>(null)

  const [isResetting, setIsResetting] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)

  // 📱 3D 터널 모멘텀 감쇠 애니메이션 루프
  useEffect(() => {
    let active = true

    const updateSmoothScroll = () => {
      if (!active) return
      
      const target = scrollYRef.current
      const current = smoothScrollYRef.current
      const diff = target - current

      if (Math.abs(diff) > 0.05) {
        smoothScrollYRef.current += diff * 0.15
        setSmoothScrollY(smoothScrollYRef.current)
      } else if (current !== target) {
        smoothScrollYRef.current = target
        setSmoothScrollY(target)
      }

      requestAnimationFrame(updateSmoothScroll)
    }

    requestAnimationFrame(updateSmoothScroll)
    return () => { active = false }
  }, [])

  // 💡 스크롤바 이동 값을 3D 렌더링 엔진으로 확실하게 전달합니다.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      scrollYRef.current = container.scrollTop
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    
    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [selectedPost, userPosts.length])

  // 로컬스토리지 튜토리얼 데이터 로드
  useEffect(() => {
    const hideTutorial = localStorage.getItem("hide_feedback_tutorial_v2")
    if (hideTutorial === "true") {
      setShowTutorial(false)
    }
  }, [])

  useEffect(() => {
    if (isResetting) {
      const raf = requestAnimationFrame(() => {
        setIsResetting(false)
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isResetting])

  // 카드 클릭 시 피드백 진입
  const handleCardClick = (startIndex: number) => {
    const queue = [
      ...userPosts.slice(startIndex),
      ...userPosts.slice(0, startIndex),
    ]
    setFeedbackQueue(queue)
    setCurrentQueueIndex(0)
    setSelectedPost(userPosts[startIndex])
    setSwipeOffset(0)
    setSwipeOutDirection(null)
    setShowExitModal(false)

    const hideTutorial = localStorage.getItem("hide_feedback_tutorial_v2")
    if (hideTutorial === "true") {
      setShowTutorial(false)
    } else {
      setShowTutorial(true)
    }
  }

  const handleCloseFeedback = () => setShowExitModal(true)
  const handleConfirmTutorial = () => setShowTutorial(false)
  const handleHideTutorialForever = () => {
    localStorage.setItem("hide_feedback_tutorial_v2", "true")
    setShowTutorial(false)
  }

  const handleSwipeStart = (clientX: number) => {
    if (showTutorial || showExitModal) return
    setIsDragging(true)
    setDragStartX(clientX)
  }

  const handleSwipeMove = (clientX: number) => {
    if (!isDragging || showTutorial || showExitModal) return
    const currentOffset = clientX - dragStartX
    setSwipeOffset(currentOffset)
  }

  const handleSwipeEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (swipeOffset > 110) {
      triggerSwipeOut("right")
    } else if (swipeOffset < -110) {
      triggerSwipeOut("left")
    } else {
      setSwipeOffset(0)
    }
  }

  const triggerSwipeOut = (direction: "left" | "right") => {
    setSwipeOutDirection(direction)
    setSwipeOffset(direction === "right" ? 500 : -500)

    setTimeout(() => {
      const nextIndex = currentQueueIndex + 1
      if (nextIndex < feedbackQueue.length) {
        setIsResetting(true)
        setCurrentQueueIndex(nextIndex)
        setSwipeOffset(0)
        setSwipeOutDirection(null)
      } else {
        setCurrentQueueIndex(nextIndex)
        setShowExitModal(true)
      }
    }, 320)
  }

  const handleContinueFeedback = () => {
    setShowExitModal(false)
    if (currentQueueIndex >= feedbackQueue.length) {
      setSelectedPost(null)
    }
  }

  const handleExitFeedback = () => {
    setShowExitModal(false)
    setSelectedPost(null)
  }

  if (userPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-zinc-400 bg-white">
        <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-3">📸</div>
        <p className="text-sm font-medium">아직 업로드된 스타일이 없습니다.</p>
        <p className="text-xs text-zinc-400 mt-1">하단 카메라 버튼을 눌러 첫 사진을 올려보세요!</p>
      </div>
    )
  }

  // -------------------------------------------------------------
  // 📱 [1] 스와이프 피드백 모드 레이아웃
  // -------------------------------------------------------------
  if (selectedPost) {
    const activePost = currentQueueIndex < feedbackQueue.length ? feedbackQueue[currentQueueIndex] : feedbackQueue[feedbackQueue.length - 1]
    const nextPost = currentQueueIndex + 1 < feedbackQueue.length ? feedbackQueue[currentQueueIndex + 1] : null
    const completedCount = currentQueueIndex
    const stampsEarned = Math.floor(completedCount / 4)

    const nextCardScale = Math.min(1, 0.95 + (Math.abs(swipeOffset) / 200) * 0.05)
    const nextCardOpacity = Math.min(1, 0.8 + (Math.abs(swipeOffset) / 200) * 0.2)

    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col justify-between overflow-hidden">
        
        {/* 피드백 현황 및 닫기 버튼 배치 */}
        <div className="px-6 py-5 flex justify-between items-center z-40">
          <span className="text-[17px] font-bold text-zinc-700 tracking-wider">
            {completedCount}개 피드백 중
          </span>
          <button onClick={handleCloseFeedback} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors">
            <X className="w-6 h-6 text-black" strokeWidth={1.5} />
          </button>
        </div>

        {/* 📸 사진 크기를 편집 페이지(upload-preview-screen)와 동일하게 지정 및 라운드 값 24 적용 */}
        <div className="flex-1 w-full px-4 pb-2 min-h-0 flex justify-center items-center relative">
          <div 
            className="relative h-full max-h-[75vh] aspect-[22/29] shrink-0 select-none"
            style={{ touchAction: "none" }}
            onMouseDown={(e) => handleSwipeStart(e.clientX)}
            onMouseMove={(e) => handleSwipeMove(e.clientX)}
            onMouseUp={handleSwipeEnd}
            onMouseLeave={handleSwipeEnd}
            onTouchStart={(e) => handleSwipeStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleSwipeMove(e.touches[0].clientX)}
            onTouchEnd={handleSwipeEnd}
          >
            {nextPost && !showExitModal && (
              <div 
                className="absolute inset-0 w-full h-full rounded-[24px] overflow-hidden bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-zinc-200/40 pointer-events-none origin-center"
                style={{
                  transform: `scale(${nextCardScale}) translateY(${(1 - nextCardScale) * 120}px)`,
                  opacity: nextCardOpacity,
                  transition: (isDragging || isResetting) ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
                  zIndex: 5
                }}
              >
                <Image src={nextPost.imageData} alt="Next Style" fill className="object-cover pointer-events-none" unoptimized />
              </div>
            )}

            <div
              className="absolute inset-0 w-full h-full rounded-[24px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-zinc-200/40 overflow-hidden"
              style={{
                transform: `translate3d(${swipeOffset}px, 0, 0) rotate(${swipeOffset * 0.04}deg)`,
                transition: (isDragging || isResetting) ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform",
                zIndex: 10
              }}
            >
              <Image src={activePost.imageData} alt="Current Style" fill className="object-cover pointer-events-none" unoptimized />

              {swipeOffset > 20 && (
                <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center pointer-events-none transition-opacity" style={{ opacity: Math.min(0.8, swipeOffset / 100) }}>
                  <div className="bg-white/90 p-5 rounded-full shadow-lg transform scale-110">
                    <ThumbsUp className="w-12 h-12 text-emerald-500 fill-emerald-500" />
                  </div>
                </div>
              )}
              {swipeOffset < -20 && (
                <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center pointer-events-none transition-opacity" style={{ opacity: Math.min(0.8, Math.abs(swipeOffset) / 100) }}>
                  <div className="bg-white/90 p-5 rounded-full shadow-lg transform scale-110">
                    <ThumbsDown className="w-12 h-12 text-rose-500 fill-rose-500" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {showTutorial && !showExitModal && (
            <div className="absolute inset-0 bg-[#d6d6d6]/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-6 select-none">
              
              {/* 모달 컨테이너 (라운드 값 24 적용) */}
              <div className="w-full max-w-[320px] bg-[#f7f7f7] rounded-[24px] py-12 px-6 flex flex-col items-center shadow-lg">
                
                {/* 쭈업 (Thumbs Up) 아이콘 */}
                <div className="w-12 h-12 mb-8">
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-[#EA5C1F]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                </div>

                {/* 텍스트 설명 */}
                <div className="text-center text-[#EA5C1F] text-[18px] font-bold leading-relaxed mb-8 tracking-tight">
                  <p>쭈업은 위, 쭈따는 아래</p>
                  <p>상하로 화면을 밀어주세요</p>
                </div>

                {/* 쭈따 (Thumbs Down) 아이콘 */}
                <div className="w-12 h-12">
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-[#EA5C1F]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                  </svg>
                </div>
                
              </div>

              {/* 하단 닫기 버튼 */}
              <button 
                onClick={handleConfirmTutorial}
                className="mt-10 w-12 h-12 rounded-full border-[3px] border-white bg-transparent flex items-center justify-center transition-transform active:scale-95"
                aria-label="닫기"
              >
                <X className="w-7 h-7 text-white" strokeWidth={3} />
              </button>
            </div>
          )}

          {/* 나가기 모달 (Exit Modal) 부분 (라운드 값 24 적용 및 문구 한 줄 처리) */}
          {showExitModal && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-6 select-none">
              <div className="w-full max-w-[320px] bg-white rounded-[24px] px-6 py-10 flex flex-col items-center shadow-2xl">
                <h3 className="text-2xl font-black text-[#111111] text-center">쭈템프 {stampsEarned}개 획득</h3>
                <p className="text-sm font-medium text-zinc-400 mt-3 mb-10 text-center">
                  총 {completedCount}명의 쭈꾸미에게 피드백을 전달했어요
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={handleContinueFeedback} 
                    className="w-full py-4 bg-[#FF6200] text-white rounded-full font-bold text-sm text-center"
                  >
                    계속 진행 하기
                  </button>
                  <button 
                    onClick={handleExitFeedback} 
                    className="w-full py-4 bg-[#FFFFFF] border-[2px] border-[#9D9D9D] text-[#111111] rounded-full font-bold text-sm text-center"
                  >
                    나가기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-full flex justify-center items-center select-none pb-2">
          <div className="w-36 h-1 bg-black rounded-full" />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // 🌌 [2] 3D 터널 레이아웃 + 스크롤바 바인딩 연동 엔진
  // -------------------------------------------------------------
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-y-scroll overflow-x-hidden bg-white
                 [&::-webkit-scrollbar]:w-[6px]
                 [&::-webkit-scrollbar-track]:bg-transparent
                 [&::-webkit-scrollbar-thumb]:bg-zinc-300
                 [&::-webkit-scrollbar-thumb]:rounded-full"
      style={{ touchAction: "pan-y" }}
    >
      {/* 가상 스페이스 레일: 스크롤 컨테이너의 가상 스크롤바 높이를 유연하게 잡아주는 가상 높이 엘리먼트 */}
      <div 
        className="w-full pointer-events-none" 
        style={{ height: `${100 + userPosts.length * 45}vh` }} 
      />

      {/* 고정 3D 시점 카메라 프레임 */}
      <div 
        className="sticky inset-y-0 left-0 w-full h-[calc(100vh-80px)] pointer-events-none flex items-center justify-center"
        style={{ 
          perspective: "1000px",
          transformStyle: "preserve-3d"
        }}
      >
        {userPosts.map((post, i) => {
          const angle = i * 1.37
          const tunnelRadius = 130 + (i * 12) 
          
          const translateX = Math.cos(angle) * tunnelRadius
          const translateY = Math.sin(angle) * tunnelRadius
          
          const rotateZ = 0

          // 실시간으로 갱신되는 smoothScrollY 수치를 곱해 스크롤할 때 앞으로 돌진하도록 제어합니다.
          const initialZ = -i * 450 
          const currentZ = initialZ + (smoothScrollY * 2.2)

          if (currentZ > 250) return null

          const progress = (currentZ + 1500) / 1750 
          const scale = Math.min(Math.max(0.15, progress * 1.25), 1.5)

          let opacity = 1
          if (currentZ > 50) {
            opacity = 1 - ((currentZ - 50) / 200)
          } else if (currentZ < -1300) {
            opacity = Math.max(0, 1 - (Math.abs(currentZ) - 1300) / 400)
          }

          return (
            <div
              key={post.id}
              onClick={() => handleCardClick(i)}
              className="absolute w-[220px] h-[290px] origin-center pointer-events-auto cursor-pointer"
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, ${currentZ * 0.4}px) scale(${scale}) rotateZ(${rotateZ}deg)`,
                zIndex: 1000 - i,
                opacity: opacity,
                willChange: "transform, opacity",
                backfaceVisibility: "hidden"
              }}
            >
              <div className="relative w-full h-full bg-white rounded-none overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.06)] border border-zinc-200/40">
                <Image 
                  src={post.imageData} 
                  alt="Style Space Element" 
                  fill 
                  className="object-cover" 
                  unoptimized 
                />

                {/* 시안 형태를 반영한 카드 상단 질문글 반투명 오버레이 */}
                {post.questionText && (
                  <div className="absolute top-2 left-2 right-2 bg-black/40 backdrop-blur-sm p-2 rounded-lg max-h-[50px] overflow-hidden">
                    <p className="text-[10px] text-white font-semibold leading-tight line-clamp-2">
                      {post.questionText}
                    </p>
                  </div>
                )}

                {/* 최신 포스트 뉴 배지 */}
                {i === 0 && (
                  <div className="absolute -top-2 -right-3 px-2 py-1 bg-[#FF6200] rounded-sm">
                    <span className="text-[8px] text-white font-medium">NEW</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}