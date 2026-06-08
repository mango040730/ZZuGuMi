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
  onVote?: (postId: string, optionIndex: number, updatedPoll: PollOption[]) => void
}

export function FloatingCards({ userPosts = [], onVote }: FloatingCardsProps) {
  const [autoAngle, setAutoAngle] = useState(0)
  const angleRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [tick, setTick] = useState(0)
  const userPostsRef = useRef(userPosts)

  useEffect(() => {
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

  const votedOptionsRef = useRef<Record<string, number>>(
    typeof window !== 'undefined'
      ? (() => { try { return JSON.parse(localStorage.getItem('zzuggumi_votes') || '{}') } catch { return {} } })()
      : {}
  )
  const [votedOptions, setVotedOptions] = useState<Record<string, number>>(votedOptionsRef.current)

  const [reviewedPosts, setReviewedPosts] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('zzuggumi_reviewed') || '[]')) } catch { return new Set() }
  })

  const isSwipingRef = useRef(false)
  const carouselDragRef = useRef(false)
  const carouselLastXRef = useRef(0)
  const carouselVelocityRef = useRef(0)
  const carouselTotalDragRef = useRef(0)
  const carouselWasDraggedRef = useRef(false)

  const handleVote = (postId: string, optionIndex: number) => {
    const prevVote = votedOptionsRef.current[postId]
    if (prevVote === optionIndex) return

    // 즉시 동기 처리 → 빠른 이중 클릭 방지
    votedOptionsRef.current = { ...votedOptionsRef.current, [postId]: optionIndex }

    const post = feedbackQueue.find(p => p.id === postId)
    if (!post?.poll) return

    const poll = post.poll.map((opt, i) => {
      if (i === prevVote) return { ...opt, votes: Math.max(0, opt.votes - 1) }
      if (i === optionIndex) return { ...opt, votes: opt.votes + 1 }
      return opt
    })

    setFeedbackQueue(prev => prev.map(p => p.id === postId ? { ...p, poll } : p))
    setVotedOptions({ ...votedOptionsRef.current })
    try { localStorage.setItem('zzuggumi_votes', JSON.stringify(votedOptionsRef.current)) } catch {}
    onVote?.(postId, optionIndex, poll)
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

  // 🔄 띠 관성 감속 & 정중앙 타겟 추적 로직
  useEffect(() => {
    let animationFrameId: number

    const rotate = () => {
      if (!carouselDragRef.current && Math.abs(carouselVelocityRef.current) > 0.01) {
        carouselVelocityRef.current *= 0.92
        angleRef.current += carouselVelocityRef.current
      }

      setAutoAngle(angleRef.current)
      setTick(Date.now())

      const totalCards = userPostsRef.current.length
      if (totalCards > 0) {
        const CARD_WIDTH = 132
        const GAP = 62
        const HALF_CHORD = (CARD_WIDTH + GAP) / 2
        let radius = 800
        if (totalCards > 14) {
          radius = HALF_CHORD / Math.sin(Math.PI / totalCards)
        }
        const anglePerCard = 2 * Math.asin(HALF_CHORD / radius) * (180 / Math.PI)

        let bestIndex = 0
        let minDiff = 9999
        for (let i = 0; i <= totalCards; i++) {
          let visualAngle = (i * anglePerCard + angleRef.current) % 360
          if (visualAngle < -180) visualAngle += 360
          if (visualAngle > 180) visualAngle -= 360
          if (Math.abs(visualAngle) < minDiff) {
            minDiff = Math.abs(visualAngle)
            bestIndex = i
          }
        }
        if (typeof window !== 'undefined') {
          (window as any).zzuggumiInsertIndex = bestIndex
        }
      }

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

  const handleCarouselPointerDown = (e: React.PointerEvent) => {
    carouselDragRef.current = true
    carouselLastXRef.current = e.clientX
    carouselTotalDragRef.current = 0
    carouselWasDraggedRef.current = false
    carouselVelocityRef.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleCarouselPointerMove = (e: React.PointerEvent) => {
    if (!carouselDragRef.current) return
    const deltaX = e.clientX - carouselLastXRef.current
    carouselLastXRef.current = e.clientX
    carouselTotalDragRef.current += Math.abs(deltaX)
    if (carouselTotalDragRef.current > 5) {
      carouselWasDraggedRef.current = true
    }
    const angleDelta = deltaX * 0.12
    angleRef.current += angleDelta
    carouselVelocityRef.current = angleDelta
    setAutoAngle(angleRef.current)
  }

  const handleCarouselPointerUp = () => {
    carouselDragRef.current = false
  }

  const handleCardClick = (startIndex: number) => {
    const allPosts = [
      ...userPosts.slice(startIndex),
      ...userPosts.slice(0, startIndex),
    ]
    const seen = new Set<string>()
    const queue = allPosts.filter(post => {
      if (reviewedPosts.has(post.id) || seen.has(post.id)) return false
      seen.add(post.id)
      return true
    })
    setFeedbackQueue(queue)
    setCurrentQueueIndex(0)
    setSelectedPost(userPosts[startIndex])
    setSwipeOffset(0)
    setSwipeOutDirection(null)
    setShowExitModal(false)
    setShowStampToast(false)

    if (queue.length > 0) {
      const hideTutorial = localStorage.getItem("hide_feedback_tutorial_v2")
      setShowTutorial(hideTutorial !== "true")
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
    if (isSwipingRef.current) return
    isSwipingRef.current = true

    const currentPost = feedbackQueue[currentQueueIndex]
    if (currentPost) {
      const newReviewed = new Set(reviewedPosts)
      newReviewed.add(currentPost.id)
      setReviewedPosts(newReviewed)
      try { localStorage.setItem('zzuggumi_reviewed', JSON.stringify([...newReviewed])) } catch {}
    }

    setSwipeOutDirection(direction)
    setSwipeOffset(direction === "down" ? 800 : -800)

    setTimeout(() => {
      isSwipingRef.current = false
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
    if (feedbackQueue.length === 0 && !showExitModal) {
      return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="h-16 w-full flex justify-end items-center px-6">
            <button onClick={handleExitFeedback} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors">
              <X className="w-6 h-6 text-black" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-1">✅</div>
            <p className="text-sm font-medium text-zinc-800">피드백할 사진이 없어요.</p>
            <p className="text-xs text-zinc-400 text-center">새로운 사진이 올라오면 다시 확인해보세요.</p>
          </div>
        </div>
      )
    }

    const activePost = currentQueueIndex < feedbackQueue.length ? feedbackQueue[currentQueueIndex] : feedbackQueue[feedbackQueue.length - 1]
    const nextPost = currentQueueIndex + 1 < feedbackQueue.length ? feedbackQueue[currentQueueIndex + 1] : null
    const completedCount = currentQueueIndex
    const stampsEarned = Math.floor(completedCount / 4)

    const nextCardScale = Math.min(1, 0.95 + (Math.abs(swipeOffset) / 300) * 0.05)
    const nextCardOpacity = Math.min(1, 0.8 + (Math.abs(swipeOffset) / 300) * 0.2)

    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col justify-between overflow-hidden" onClick={() => { if (showStampToast) setShowStampToast(false) }}>
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
          className={`absolute top-16 left-0 w-full z-50 flex justify-center px-4 transition-all duration-300 ease-out ${
            showStampToast ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div
            className="bg-[#FCDFD3] border border-[#F5C2AF] rounded-[24px] p-5 flex flex-col gap-2 shadow-none active:opacity-70 transition-opacity cursor-pointer"
            style={{ width: imageWidth ? `${imageWidth}px` : '100%', maxWidth: '100%' }}
            onClick={() => setShowStampToast(false)}
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

        <div className="flex-1 w-full px-5 pb-2 min-h-0 flex flex-col justify-center items-center relative z-10">
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
            className="relative w-full aspect-[22/29] shrink-0 select-none"
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
                className="absolute inset-0 w-full h-full rounded-[12px] overflow-hidden bg-white border border-zinc-200/40 pointer-events-none origin-center shadow-none"
                style={{
                  transform: `scale(${nextCardScale}) translateY(${(1 - nextCardScale) * 120}px)`,
                  opacity: nextCardOpacity,
                  transition: (isDragging || isResetting) ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
                  zIndex: 5
                }}
              >
                <Image src={nextPost.imageData} alt="Next Style" fill className="object-cover pointer-events-none" unoptimized />
                {nextPost.questionText && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />
                    <p className="absolute top-3 left-3 right-3 text-[24px] text-white font-semibold leading-snug line-clamp-2 z-20 drop-shadow">
                      {nextPost.questionText}
                    </p>
                  </>
                )}
              </div>
            )}

            <div
              className="absolute inset-0 w-full h-full rounded-[12px] bg-white border border-zinc-200/40 overflow-hidden shadow-none"
              style={{
                transform: `translate3d(0, ${swipeOffset}px, 0)`,
                transition: (isDragging || isResetting) ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform",
                zIndex: 10
              }}
            >
              <Image src={activePost.imageData} alt="Current Style" fill className="object-cover pointer-events-none" unoptimized />
              {activePost.questionText && (
                <>
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />
                  <p className="absolute top-3 left-3 right-3 text-[24px] text-white font-semibold leading-snug line-clamp-2 z-20 drop-shadow">
                    {activePost.questionText}
                  </p>
                </>
              )}

              {/* ⬆️ 위로 스와이프: 주황색 그라데이션 & ThumbsUp 아이콘 */}
              {swipeOffset < -20 && (
                <div 
                  className="absolute inset-0 pointer-events-none flex items-center justify-center bg-gradient-to-b from-[#FF6200]/90 via-[#FF6200]/50 to-transparent transition-opacity z-20"
                  style={{ opacity: Math.min(1, Math.abs(swipeOffset) / 100) }}
                >
                  <div className="w-[80px] h-[80px] rounded-full border-[4px] border-white flex items-center justify-center bg-transparent">
                    <ThumbsUp className="w-10 h-10 text-white" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              {/* ⬇️ 아래로 스와이프: 검정색 그라데이션 & ThumbsDown 아이콘 */}
              {swipeOffset > 20 && (
                <div 
                  className="absolute inset-0 pointer-events-none flex items-end justify-center pb-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity z-20"
                  style={{ opacity: Math.min(1, swipeOffset / 100) }}
                >
                  <div className="w-[80px] h-[80px] rounded-full border-[4px] border-white flex items-center justify-center bg-transparent">
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
                    const isSelected = votedOptions[activePost.id] === idx

                    return (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleVote(activePost.id, idx)
                        }}
                        className={`relative w-full backdrop-blur-md rounded-2xl overflow-hidden p-3 text-left transition-transform active:scale-95 ${
                          isSelected
                            ? "bg-[#FF6200]/80 border-2 border-white"
                            : "bg-black/50 border border-white/20"
                        }`}
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

          {/* 복원된 튜토리얼 모달 */}
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

          {/* 복원된 종료 모달 */}
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

      </div>
    )
  }

  // -------------------------------------------------------------
  // 🌌 [2] 3D 원형 띠(Carousel) 레이아웃
  // -------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white touch-none"
      onPointerDown={handleCarouselPointerDown}
      onPointerMove={handleCarouselPointerMove}
      onPointerUp={handleCarouselPointerUp}
      onPointerCancel={handleCarouselPointerUp}
    >
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none flex items-center justify-center -translate-y-[10%]"
        style={{ 
          perspective: "1200px",
          transformStyle: "preserve-3d"
        }}
      >

        {userPosts.map((post, i) => {
          const totalCards = userPosts.length
          
          const CARD_WIDTH = 263
          const GAP = 31
          const CHORD = CARD_WIDTH + GAP
          const HALF_CHORD = CHORD / 2

          let radius = 800

          if (totalCards > 14) {
            radius = HALF_CHORD / Math.sin(Math.PI / totalCards)
          }

          const anglePerCard = totalCards > 0 ? 2 * Math.asin(HALF_CHORD / radius) * (180 / Math.PI) : 360
          
          const cardBaseAngle = anglePerCard * i
          const currentAngle = cardBaseAngle + autoAngle
          
          const radian = (currentAngle * Math.PI) / 180
          const cosVal = Math.cos(radian)

          const age = tick - post.createdAt
          
          const isNewUpload = age < 3000

          let transformStr = `translateZ(-${radius}px) rotateY(${currentAngle}deg) translateZ(${radius}px)`
          let zIndexVal = Math.round(cosVal * 100)
          
          let opacityVal = cosVal > 0.6 ? 1 : 0.2 + ((cosVal + 1) / 1.6) * 0.8
          opacityVal = Math.max(0.2, Math.min(1, opacityVal))

          let transitionStr = "none"

          if (isNewUpload) {
            transitionStr = "none"

            if (age < 1500) {
              const introProgress = Math.min(1, age / 400)
              const ease = 1 - Math.pow(1 - introProgress, 3)
              const currentScale = 0.85 + (1.0 - 0.85) * ease

              transformStr = `translateZ(0px) rotateY(0deg) translateZ(180px) scale(${currentScale})`
              zIndexVal = 2000
              opacityVal = introProgress
            } else {
              const progress = Math.min(1, (age - 1500) / 1200)
              const ease = 1 - Math.pow(1 - progress, 3)

              const targetRadiusNeg = -radius
              const currentRadiusNeg = 0 + (targetRadiusNeg - 0) * ease

              const targetRadiusPos = radius
              const currentRadiusPos = 180 + (targetRadiusPos - 180) * ease

              const currentScale = 1.0 + (1 - 1.0) * ease

              let targetRot = currentAngle % 360
              if (targetRot > 180) targetRot -= 360
              if (targetRot < -180) targetRot += 360
              
              const currentRotateY = 0 + (targetRot - 0) * ease

              transformStr = `translateZ(${currentRadiusNeg}px) rotateY(${currentRotateY}deg) translateZ(${currentRadiusPos}px) scale(${currentScale})`
              
              const targetZIndex = Math.round(cosVal * 100)
              zIndexVal = Math.round(2000 + (targetZIndex - 2000) * ease)
              
              const targetOp = Math.max(0.2, Math.min(1, cosVal > 0.6 ? 1 : 0.2 + ((cosVal + 1) / 1.6) * 0.8))
              opacityVal = 1 + (targetOp - 1) * ease
            }
          }

          return (
            <div
              key={post.id}
              onClick={() => {
                if (carouselWasDraggedRef.current) return
                if (cosVal > 0.8 || isNewUpload) handleCardClick(i)
              }}
              className="absolute w-[263px] h-[347px] origin-center pointer-events-auto cursor-pointer"
              style={{
                transform: transformStr,
                transition: transitionStr,
                zIndex: zIndexVal,
                opacity: opacityVal,
                willChange: "transform, opacity"
              }}
            >
              <div className="relative w-full h-full bg-white rounded-[12px] overflow-hidden border border-zinc-200/40 shadow-none">
                <Image 
                  src={post.imageData} 
                  alt="Style Space Element" 
                  fill 
                  className="object-cover" 
                  unoptimized 
                />

                {post.questionText && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />
                    <p className="absolute top-3 left-3 right-3 text-[13px] text-white font-semibold leading-snug line-clamp-2 z-20 drop-shadow">
                      {post.questionText}
                    </p>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}