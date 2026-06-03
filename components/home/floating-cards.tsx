"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { X, ThumbsUp, ThumbsDown } from "lucide-react"

export interface PollOption {
  text: string
  votes: number
}

export interface Post {
  id: string
  imageData: string
  questionText: string
  createdAt: number
  poll?: PollOption[]
}

interface FloatingCardsProps {
  userPosts?: Post[]
}

export function FloatingCards({ userPosts = [] }: FloatingCardsProps) {
  const [autoAngle, setAutoAngle] = useState(0)
  const angleRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [tick, setTick] = useState(0)
  const userPostsRef = useRef(userPosts)

  // 💡 새 사진 추가 시 기존 카드들이 점프하지 않고 자연스럽게 공간을 열어주도록 각도 보정
  const prevPostsLength = useRef(userPosts.length)

  useEffect(() => {
    if (userPosts.length > prevPostsLength.current && prevPostsLength.current > 0) {
      const totalCards = userPosts.length
      const CARD_WIDTH = 220
      const GAP = 124
      const HALF_CHORD = (CARD_WIDTH + GAP) / 2
      
      let radius = 800
      if (totalCards > 14) {
        radius = HALF_CHORD / Math.sin(Math.PI / totalCards)
      }
      
      const anglePerCard = 2 * Math.asin(HALF_CHORD / radius) * (180 / Math.PI)
      
      // 새 카드가 들어올 공간을 확보하기 위해 전체 궤도를 한 칸 뒤로 밀어냅니다.
      angleRef.current -= anglePerCard
      setAutoAngle(angleRef.current)
    }
    prevPostsLength.current = userPosts.length
    userPostsRef.current = userPosts
  }, [userPosts])

  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [feedbackQueue, setFeedbackQueue] = useState<Post[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const [showTutorial, setShowTutorial] = useState(true)

  const [dragStartY, setDragStartY] = useState(0)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [swipeOutDirection, setSwipeOutDirection] = useState<"up" | "down" | null>(null)

  const [isResetting, setIsResetting] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)

  const [showStampToast, setShowStampToast] = useState(false)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [imageWidth, setImageWidth] = useState<number | undefined>(undefined)

  const handleVote = (postId: string, optionIndex: number) => {
    setFeedbackQueue(prevQueue => {
      const newQueue = [...prevQueue]
      const qIdx = newQueue.findIndex(p => p.id === postId)
      if (qIdx > -1 && newQueue[qIdx].poll) {
        const updatedPoll = [...newQueue[qIdx].poll!]
        updatedPoll[optionIndex] = { 
          ...updatedPoll[optionIndex], 
          votes: updatedPoll[optionIndex].votes + 1 
        }
        newQueue[qIdx] = { ...newQueue[qIdx], poll: updatedPoll }
      }
      return newQueue
    })

    const savedPosts = localStorage.getItem("zzuggumi_posts")
    if (savedPosts) {
      const parsed = JSON.parse(savedPosts) as Post[]
      const postIdx = parsed.findIndex(p => p.id === postId)
      if (postIdx > -1 && parsed[postIdx].poll) {
        parsed[postIdx].poll![optionIndex].votes += 1
        localStorage.setItem("zzuggumi_posts", JSON.stringify(parsed))
      }
    }
  }

  useEffect(() => {
    const container = imageContainerRef.current
    if (!container || !selectedPost) return

    const updateWidth = () => {
      setImageWidth(container.offsetWidth)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)

    return () => observer.disconnect()
  }, [selectedPost])

  useEffect(() => {
    let animationFrameId: number

    const rotate = () => {
      const now = Date.now()
      const firstPostAge = userPostsRef.current.length > 0 
        ? now - userPostsRef.current[0].createdAt 
        : 9999
      
      // 💡 업로드 후 3초 동안은 배경 띠가 일시 정지합니다.
      if (firstPostAge >= 3000) {
        angleRef.current -= 0.08 
      }
      
      setAutoAngle(angleRef.current)
      setTick(now) 
      animationFrameId = requestAnimationFrame(rotate)
    }

    if (!selectedPost) {
      animationFrameId = requestAnimationFrame(rotate)
    }

    return () => cancelAnimationFrame(animationFrameId)
  }, [selectedPost])

  useEffect(() => {
    const hideTutorial = localStorage.getItem("hide_feedback_tutorial_v2")
    if (hideTutorial === "true") {
      setShowTutorial(false)
    }
  }, [])

  useEffect(() => {
    if (isResetting) {
      const raf = requestAnimationFrame(() => setIsResetting(false))
      return () => cancelAnimationFrame(raf)
    }
  }, [isResetting])

  useEffect(() => {
    if (currentQueueIndex > 0 && currentQueueIndex % 4 === 0) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setShowStampToast(true)
      toastTimerRef.current = setTimeout(() => setShowStampToast(false), 3000)
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [currentQueueIndex])

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
    setShowStampToast(false)

    const hideTutorial = localStorage.getItem("hide_feedback_tutorial_v2")
    if (hideTutorial === "true") {
      setShowTutorial(false)
    } else {
      setShowTutorial(true)
    }
  }

  const handleCloseFeedback = () => setShowExitModal(true)
  const handleConfirmTutorial = () => setShowTutorial(false)
  
  const handleSwipeStart = (clientY: number) => {
    if (showTutorial || showExitModal) return
    setIsDragging(true)
    setDragStartY(clientY)
  }

  const handleSwipeMove = (clientY: number) => {
    if (!isDragging || showTutorial || showExitModal) return
    const currentOffset = clientY - dragStartY
    setSwipeOffset(currentOffset)
  }

  const handleSwipeEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (swipeOffset > 130) triggerSwipeOut("down")
    else if (swipeOffset < -130) triggerSwipeOut("up")
    else setSwipeOffset(0)
  }

  const triggerSwipeOut = (direction: "up" | "down") => {
    setSwipeOutDirection(direction)
    setSwipeOffset(direction === "down" ? 800 : -800)

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
  // 📱 [1] 스와이프 피드백 모드 레이아웃 (이전과 동일)
  // -------------------------------------------------------------
  if (selectedPost) {
    const activePost = currentQueueIndex < feedbackQueue.length ? feedbackQueue[currentQueueIndex] : feedbackQueue[feedbackQueue.length - 1]
    const nextPost = currentQueueIndex + 1 < feedbackQueue.length ? feedbackQueue[currentQueueIndex + 1] : null
    const completedCount = currentQueueIndex
    const stampsEarned = Math.floor(completedCount / 4)

    const nextCardScale = Math.min(1, 0.95 + (Math.abs(swipeOffset) / 300) * 0.05)
    const nextCardOpacity = Math.min(1, 0.8 + (Math.abs(swipeOffset) / 300) * 0.2)

    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          {swipeOffset < -20 && (
            <div 
              className="absolute inset-0 bg-gradient-to-b from-[#FF6200]/60 via-[#FF6200]/20 to-transparent transition-opacity" 
              style={{ opacity: Math.min(1, Math.abs(swipeOffset) / 100) }} 
            />
          )}
          {swipeOffset > 20 && (
            <div 
              className="absolute inset-0 bg-gradient-to-t from-[#000000]/80 via-[#000000]/40 to-transparent transition-opacity" 
              style={{ opacity: Math.min(1, swipeOffset / 100) }} 
            />
          )}
        </div>

        <div 
          className={`absolute top-16 left-0 w-full z-50 flex justify-center px-4 pointer-events-none transition-all duration-300 ease-out ${
            showStampToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          }`}
        >
          <div 
            className="bg-[#FCDFD3] border border-[#F5C2AF] rounded-[24px] p-5 shadow-[0_12px_24px_rgba(234,92,31,0.12)] flex flex-col gap-2"
            style={{ width: imageWidth ? `${imageWidth}px` : '100%', maxWidth: '100%' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xl">🎉</span>
              <h4 className="text-[18px] font-bold text-[#111111]">쭈템프 1개 획득</h4>
            </div>
            <div className="text-[15px] font-medium text-[#4D4D4D] leading-tight">
              <p>대단해요!</p>
              <p>현재 {completedCount}명의 쭈꾸미에게 피드백을 전달했어요</p>
            </div>
          </div>
        </div>

        <div className="relative h-16 w-full z-40 flex justify-end items-center px-6">
          <button 
            onClick={handleCloseFeedback} 
            disabled={showTutorial}
            className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors ${
              showTutorial ? "opacity-20 cursor-not-allowed" : "opacity-100"
            }`}
          >
            <X className="w-6 h-6 text-black" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 w-full px-4 pb-2 min-h-0 flex flex-col justify-center items-center relative z-10">
          <div 
            className="flex justify-start mb-3"
            style={{ width: imageWidth ? `${imageWidth}px` : '100%', maxWidth: '100%' }}
          >
            <span className="text-[17px] font-bold text-zinc-800 tracking-wider">
              {completedCount}개 피드백 중
            </span>
          </div>

          <div 
            ref={imageContainerRef}
            className="relative h-full max-h-[75vh] aspect-[22/29] shrink-0 select-none"
            style={{ touchAction: "none" }}
            onMouseDown={(e) => handleSwipeStart(e.clientY)} 
            onMouseMove={(e) => handleSwipeMove(e.clientY)}
            onMouseUp={handleSwipeEnd}
            onMouseLeave={handleSwipeEnd}
            onTouchStart={(e) => handleSwipeStart(e.touches[0].clientY)} 
            onTouchMove={(e) => handleSwipeMove(e.touches[0].clientY)}
            onTouchEnd={handleSwipeEnd}
          >
            {nextPost && !showExitModal && (
              <div 
                className="absolute inset-0 w-full h-full rounded-none overflow-hidden bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-zinc-200/40 pointer-events-none origin-center"
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
              className="absolute inset-0 w-full h-full rounded-none bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-zinc-200/40 overflow-hidden"
              style={{
                transform: `translate3d(0, ${swipeOffset}px, 0)`,
                transition: (isDragging || isResetting) ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform",
                zIndex: 10
              }}
            >
              <Image src={activePost.imageData} alt="Current Style" fill className="object-cover pointer-events-none" unoptimized />

              {swipeOffset < -20 && (
                <div 
                  className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gradient-to-b from-[#FF6200]/90 via-[#FF6200]/50 to-transparent transition-opacity z-20"
                  style={{ opacity: Math.min(1, Math.abs(swipeOffset) / 100) }}
                >
                  <div className="w-[80px] h-[80px] rounded-full border-[4px] border-white flex items-center justify-center shadow-lg bg-transparent">
                    <ThumbsUp className="w-10 h-10 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              {swipeOffset > 20 && (
                <div 
                  className="absolute inset-0 pointer-events-none flex items-end justify-center pb-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity z-20"
                  style={{ opacity: Math.min(1, swipeOffset / 100) }}
                >
                  <div className="w-[80px] h-[80px] rounded-full border-[4px] border-white flex items-center justify-center shadow-lg bg-transparent">
                    <ThumbsDown className="w-10 h-10 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              {activePost.poll && activePost.poll.length > 0 && (
                <div 
                  className="absolute bottom-5 right-4 z-50 flex flex-col gap-2 w-[160px]" 
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {activePost.poll.map((opt, idx) => {
                    const totalVotes = activePost.poll!.reduce((acc, curr) => acc + curr.votes, 0)
                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100)
                    
                    return (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVote(activePost.id, idx)
                        }}
                        className="relative w-full bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden p-3 text-left transition-transform active:scale-95 shadow-lg"
                      >
                        <div
                          className="absolute top-0 left-0 bottom-0 bg-[#FF6200]/90 z-0 transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="relative z-10 flex justify-between items-center text-white text-sm font-bold">
                          <span className="truncate pr-2 drop-shadow-md">{opt.text}</span>
                          <span className="text-[12px] opacity-90 shrink-0 drop-shadow-md">{percentage}%</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {showTutorial && !showExitModal && (
            <div className="absolute inset-0 bg-[#d6d6d6]/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center p-6 select-none">
              <div className="w-full max-w-[320px] bg-[#f7f7f7] rounded-[24px] py-12 px-6 flex flex-col items-center shadow-lg">
                <div className="w-12 h-12 mb-8">
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-[#EA5C1F]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                </div>
                <div className="text-center text-[#EA5C1F] text-[18px] font-bold leading-relaxed mb-8 tracking-tight">
                  <p>쭈업은 위, 쭈따는 아래</p>
                  <p>상하로 화면을 밀어주세요</p>
                </div>
                <div className="w-12 h-12">
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-[#EA5C1F]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                  </svg>
                </div>
              </div>
              <button 
                onClick={handleConfirmTutorial}
                className="mt-10 w-12 h-12 rounded-full border-[3px] border-white bg-transparent flex items-center justify-center transition-transform active:scale-95"
                aria-label="닫기"
              >
                <X className="w-7 h-7 text-white" strokeWidth={3} />
              </button>
            </div>
          )}

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
                    className="w-full py-4 bg-[#FF6200] text-white rounded-full font-bold text-sm text-center transition-transform active:scale-95"
                  >
                    계속 진행 하기
                  </button>
                  <button 
                    onClick={handleExitFeedback} 
                    className="w-full py-4 bg-[#FFFFFF] border-[2px] border-[#9D9D9D] text-[#111111] rounded-full font-bold text-sm text-center transition-transform active:scale-95"
                  >
                    나가기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-full flex justify-center items-center select-none pb-2">
          <div className="w-36 h-1 bg-zinc-300 rounded-full" />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // 🌌 [2] 3D 원통형(Carousel) 레이아웃 - 스며드는 애니메이션 적용
  // -------------------------------------------------------------
  
  const isCarouselPaused = userPosts.length > 0 && (tick - userPosts[0].createdAt) < 3000

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white touch-none"
    >
      <div 
        className="absolute inset-y-0 left-0 w-full h-[calc(100vh-80px)] pointer-events-none flex items-center justify-center"
        style={{ 
          perspective: "1200px",
          transformStyle: "preserve-3d"
        }}
      >
        {userPosts.map((post, i) => {
          const totalCards = userPosts.length
          
          const CARD_WIDTH = 220
          const GAP = 124
          const CHORD = CARD_WIDTH + GAP 
          const HALF_CHORD = CHORD / 2 // 172

          let radius = 800

          if (totalCards > 14) {
            radius = HALF_CHORD / Math.sin(Math.PI / totalCards)
          }

          const anglePerCard = 2 * Math.asin(HALF_CHORD / radius) * (180 / Math.PI)
          const cardBaseAngle = anglePerCard * i
          const currentAngle = cardBaseAngle + autoAngle
          
          const radian = (currentAngle * Math.PI) / 180
          const cosVal = Math.cos(radian)

          const age = tick - post.createdAt
          // 💡 새 사진 업로드 시 3초에 걸쳐 애니메이션 진행
          const isNewUpload = i === 0 && age < 3000

          let transformStr = `translateZ(-${radius}px) rotateY(${currentAngle}deg) translateZ(${radius}px)`
          let zIndexVal = Math.round(cosVal * 100)
          
          let opacityVal = cosVal > 0.6 ? 1 : 0.2 + ((cosVal + 1) / 1.6) * 0.8
          opacityVal = Math.max(0.2, Math.min(1, opacityVal))

          let transitionStr = "none"

          if (isNewUpload) {
            // 자바스크립트 프레임 애니메이션으로 통제하므로 CSS 트랜지션 해제
            transitionStr = "none"

            if (age < 1500) {
              // [페이즈 1]: 처음 1.5초 동안 화면 중앙에 머무르며 시선을 집중시킵니다.
              const introProgress = Math.min(1, age / 400) // 0.4초 만에 서서히 나타남
              const introEase = 1 - Math.pow(1 - introProgress, 3)
              const introScale = 0.8 + (1.2 - 0.8) * introEase
              
              transformStr = `translateZ(0px) rotateY(0deg) translateZ(300px) scale(${introScale})`
              zIndexVal = 2000 
              opacityVal = introProgress
            } else {
              // [페이즈 2]: 남은 1.5초 동안 뒤쪽 회전 띠의 지정된 위치로 부드럽게 스며들어 갑니다.
              const progress = Math.min(1, (age - 1500) / 1500) 
              const ease = 1 - Math.pow(1 - progress, 3)
              
              const currentRadiusNeg = 0 + (-radius - 0) * ease
              const currentRotateY = 0 + (currentAngle - 0) * ease
              const currentRadiusPos = 300 + (radius - 300) * ease
              const currentScale = 1.2 + (1 - 1.2) * ease

              transformStr = `translateZ(${currentRadiusNeg}px) rotateY(${currentRotateY}deg) translateZ(${currentRadiusPos}px) scale(${currentScale})`
              zIndexVal = 2000 
              
              const targetOpacity = cosVal > 0.6 ? 1 : 0.2 + ((cosVal + 1) / 1.6) * 0.8
              opacityVal = 1 + (Math.max(0.2, Math.min(1, targetOpacity)) - 1) * ease
            }
          } else if (isCarouselPaused) {
            // 💡 기존에 돌고 있던 사진들은 새 사진이 들어갈 자리를 열어주기 위해 CSS로 스르륵 밀려납니다.
            transitionStr = "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s ease"
          }

          return (
            <div
              key={post.id}
              onClick={() => {
                if (cosVal > 0.8 || isNewUpload) handleCardClick(i)
              }}
              className="absolute w-[220px] h-[290px] origin-center pointer-events-auto cursor-pointer"
              style={{
                transform: transformStr,
                transition: transitionStr,
                zIndex: zIndexVal,
                opacity: opacityVal,
                willChange: "transform, opacity",
                WebkitBoxReflect: "below 4px linear-gradient(to bottom, transparent 65%, rgba(0,0,0,0.5))"
              }}
            >
              <div className="relative w-full h-full bg-white rounded-none overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-zinc-200/40">
                <Image 
                  src={post.imageData} 
                  alt="Style Space Element" 
                  fill 
                  className="object-cover" 
                  unoptimized 
                />

                {post.questionText && (
                  <div className="absolute top-2 left-2 right-2 bg-black/40 backdrop-blur-sm p-2 rounded-lg max-h-[50px] overflow-hidden">
                    <p className="text-[10px] text-white font-semibold leading-tight line-clamp-2">
                      {post.questionText}
                    </p>
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