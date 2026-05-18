"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { X, ThumbsUp, ThumbsDown, ArrowLeftRight } from "lucide-react"

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
  // 3D 터널 탐색용 실제 스크롤 좌표와 부드럽게 따라오는 감쇠(Lerp) 좌표
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

  // 💡 다음 카드가 나타날 때 제자리로 되돌아오는 슬라이드 잔상 차단 제어용 상태
  const [isResetting, setIsResetting] = useState(false)

  // 🎁 [수정] 쭈템프 획득 모달 활성화 제어 상태
  const [showExitModal, setShowExitModal] = useState(false)

  // 📱 [성능 최적화] 3D 터널 모멘텀 감쇠 애니메이션 루프
  useEffect(() => {
    let active = true

    const updateSmoothScroll = () => {
      if (!active) return

      // 피드백 페이지가 열려있을 때는 3D 렌더링 스크롤 연산을 정지하여 과부하를 막습니다.
      if (selectedPost) {
        requestAnimationFrame(updateSmoothScroll)
        return
      }

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

    return () => {
      active = false
    }
  }, [selectedPost])

  // 3D 공간 마우스 휠 및 터치 스크롤 이벤트 연동
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let initialDist = 0
    let initialScrollTop = 0
    let isPinching = false

    const handleScroll = () => {
      if (!selectedPost) {
        scrollYRef.current = container.scrollTop
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (selectedPost) return 
      if (e.touches.length === 2) {
        isPinching = true
        initialDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        initialScrollTop = container.scrollTop
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (selectedPost) return
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault()
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const deltaDist = currentDist - initialDist
        container.scrollTop = initialScrollTop + (deltaDist * 3.5)
      }
    }

    const handleTouchEnd = () => {
      isPinching = false
    }

    const handleWheel = (e: WheelEvent) => {
      if (selectedPost) return
      if (e.ctrlKey) {
        e.preventDefault()
        container.scrollTop -= e.deltaY * 3.5
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    container.addEventListener("touchstart", handleTouchStart, { passive: true })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd)
    container.addEventListener("touchcancel", handleTouchEnd)
    container.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      container.removeEventListener("scroll", handleScroll)
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
      container.removeEventListener("touchcancel", handleTouchEnd)
      container.removeEventListener("wheel", handleWheel)
    }
  }, [selectedPost])

  // 💾 튜토리얼 갱신용 로컬스토리지 불러오기
  useEffect(() => {
    const hideTutorial = localStorage.getItem("hide_feedback_tutorial_v2")
    if (hideTutorial === "true") {
      setShowTutorial(false)
    }
  }, [])

  // 💡 리셋 제어가 들어간 직후 다음 프레임에서 트랜지션을 즉각적으로 복구합니다.
  useEffect(() => {
    if (isResetting) {
      const raf = requestAnimationFrame(() => {
        setIsResetting(false)
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [isResetting])

  // 🎯 사진 카드 클릭 시 피드백 페이지 실행 세팅
  const handleCardClick = (startIndex: number) => {
    // 클릭한 카드부터 시작하여 순환하는 큐(Queue) 리스트 빌드
    const queue = [
      ...userPosts.slice(startIndex),
      ...userPosts.slice(0, startIndex),
    ]
    setFeedbackQueue(queue)
    setCurrentQueueIndex(0)
    setSelectedPost(userPosts[startIndex])
    setSwipeOffset(0)
    setSwipeOutDirection(null)
    setShowExitModal(false) // 모달 상태 리셋

    // 피드백 페이지에 새로 집입할 때마다 가이드 재노출 여부 초기화
    const hideTutorial = localStorage.getItem("hide_feedback_tutorial_v2")
    if (hideTutorial === "true") {
      setShowTutorial(false)
    } else {
      setShowTutorial(true)
    }
  }

  // 닫기 버튼 클릭 시 (즉시 닫지 않고, 쭈템프 획득 모달 활성화)
  const handleCloseFeedback = () => {
    setShowExitModal(true)
  }

  // 튜토리얼 닫기 ("확인" 누를 시 이번 세션에서만 임시 차단)
  const handleConfirmTutorial = () => {
    setShowTutorial(false)
  }

  // 튜토리얼 다시는 보지 않기 (v2 키가 영구 등록되어 다음 진입 시에도 계속 생략됩니다)
  const handleHideTutorialForever = () => {
    localStorage.setItem("hide_feedback_tutorial_v2", "true")
    setShowTutorial(false)
  }

  // 👉 스와이프 시작 포인터 핸들러
  const handleSwipeStart = (clientX: number) => {
    if (showTutorial || showExitModal) return
    setIsDragging(true)
    setDragStartX(clientX)
  }

  // 🔄 스와이프 드래그 진행 중 좌표 업데이트
  const handleSwipeMove = (clientX: number) => {
    if (!isDragging || showTutorial || showExitModal) return
    const currentOffset = clientX - dragStartX
    setSwipeOffset(currentOffset)
  }

  // 📥 스와이프 종료 핸들러 (피드백 판정)
  const handleSwipeEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    // 기준점 110px 이상 스와이프 시 완전히 날아가는 판정
    if (swipeOffset > 110) {
      triggerSwipeOut("right") // 쭈업 (추천)
    } else if (swipeOffset < -110) {
      triggerSwipeOut("left") // 쭈따 (비추천)
    } else {
      setSwipeOffset(0) // 원치 않는 작은 오차는 제자리 원복
    }
  }

  // 🚀 카드가 화면 밖으로 슝 날아가며 피드백을 기록하는 모션
  const triggerSwipeOut = (direction: "left" | "right") => {
    setSwipeOutDirection(direction)
    setSwipeOffset(direction === "right" ? 500 : -500)

    console.log(`피드백 완료: 포스트 ID [${feedbackQueue[currentQueueIndex].id}] -> 결과 [${direction === "right" ? "쭈업 👍" : "쭈따 👎"}]`)

    setTimeout(() => {
      const nextIndex = currentQueueIndex + 1
      if (nextIndex < feedbackQueue.length) {
        setIsResetting(true) // 새 카드를 세팅하는 순간에만 미세한 역방향 잔상 트랜지션을 영구 무력화시킵니다.
        setCurrentQueueIndex(nextIndex)
        setSwipeOffset(0)
        setSwipeOutDirection(null)
      } else {
        // 💡 [수정] 모든 피드백을 완료했을 때 바로 닫히지 않고, 최종 완료 숫자를 반영한 뒤 쭈템프 모달을 표시합니다.
        setCurrentQueueIndex(nextIndex)
        setShowExitModal(true)
      }
    }, 320)
  }

  // 🎁 쭈템프 모달 "계속 진행 하기" 제어
  const handleContinueFeedback = () => {
    setShowExitModal(false)
    // 만약 피드백 리스트를 다 마친 상태에서 계속 진행하기를 누른 경우, 다시 탐색할 수 있도록 피드백 모드를 닫아줍니다.
    if (currentQueueIndex >= feedbackQueue.length) {
      setSelectedPost(null)
    }
  }

  // 🎁 쭈템프 모달 "나가기" 제어 (피드백 종료 및 메인 복귀)
  const handleExitFeedback = () => {
    setShowExitModal(false)
    setSelectedPost(null)
  }

  if (userPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-zinc-400 bg-white">
        <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-3 animate-pulse">
          📸
        </div>
        <p className="text-sm font-medium">아직 업로드된 스타일이 없습니다.</p>
        <p className="text-xs text-zinc-400 mt-1">하단 카메라 버튼을 눌러 첫 사진을 올려보세요!</p>
      </div>
    )
  }

  // -------------------------------------------------------------
  // 📱 [1] 스와이프 피드백 페이지 레이아웃
  // -------------------------------------------------------------
  if (selectedPost) {
    const activePost = currentQueueIndex < feedbackQueue.length ? feedbackQueue[currentQueueIndex] : feedbackQueue[feedbackQueue.length - 1]
    // 대기 중인 다음 포스트 정보 가져오기
    const nextPost = currentQueueIndex + 1 < feedbackQueue.length ? feedbackQueue[currentQueueIndex + 1] : null
    
    // 피드백 상태 카운팅: 0에서부터 카드 완료 시 증가
    const completedCount = currentQueueIndex

    // 💡 [수정] 4장 완료 시 1개 스탬프 지급 연산 공식 (Math.floor 사용)
    const stampsEarned = Math.floor(completedCount / 4)

    // 현재 카드를 당겼을 때 뒤에 깔린 카드가 스르륵 올라오는 동적 배율 계산
    const nextCardScale = Math.min(1, 0.95 + (Math.abs(swipeOffset) / 200) * 0.05)
    const nextCardOpacity = Math.min(1, 0.8 + (Math.abs(swipeOffset) / 200) * 0.2)

    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col justify-between overflow-hidden">
        {/* 상단 노치 바 및 시간 바 (iOS 데코레이션 스타일) */}
        <div className="px-6 pt-3 pb-1 flex justify-between items-center text-xs font-bold text-black select-none">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-3 bg-black rounded-sm block" />
            <span className="w-3.5 h-3 bg-black rounded-sm block" />
          </div>
        </div>

        {/* 최상단 헤더 바 (X 버튼 및 피드백 카운트) */}
        <div className="px-5 py-3 flex justify-between items-center z-40">
          <button 
            onClick={handleCloseFeedback}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors pointer-events-auto"
          >
            <X className="w-6 h-6 text-black" strokeWidth={1.5} />
          </button>
          
          {/* 오직 현재 증감하는 숫자만 크고 명확하게 노출 */}
          <span className="text-[17px] font-bold text-zinc-700 tracking-wider">
            {completedCount}
          </span>
        </div>

        {/* 🎴 메인 피드백 카드 영역 */}
        <div className="flex-1 flex items-center justify-center px-6 relative">
          <div 
            className="relative w-full max-w-[340px] aspect-[3/4] select-none"
            style={{ touchAction: "none" }}
            onMouseDown={(e) => handleSwipeStart(e.clientX)}
            onMouseMove={(e) => handleSwipeMove(e.clientX)}
            onMouseUp={handleSwipeEnd}
            onMouseLeave={handleSwipeEnd}
            onTouchStart={(e) => handleSwipeStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleSwipeMove(e.touches[0].clientX)}
            onTouchEnd={handleSwipeEnd}
          >
            {/* 층 레이어 1: 뒤에서 대기 중인 다음 카드 */}
            {nextPost && !showExitModal && (
              <div 
                className="absolute inset-0 w-full h-full rounded-[12px] overflow-hidden bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-zinc-200/40 pointer-events-none origin-center"
                style={{
                  transform: `scale(${nextCardScale}) translateY(${(1 - nextCardScale) * 120}px)`,
                  opacity: nextCardOpacity,
                  transition: (isDragging || isResetting) ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
                  zIndex: 5
                }}
              >
                <Image
                  src={nextPost.imageData}
                  alt="Next Style Preview"
                  fill
                  className="object-cover pointer-events-none"
                  unoptimized
                />
              </div>
            )}

            {/* 층 레이어 2: 현재 스와이프 조작 중인 메인 활성 카드 */}
            <div
              className="absolute inset-0 w-full h-full rounded-[12px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-zinc-200/40 overflow-hidden"
              style={{
                transform: `translate3d(${swipeOffset}px, 0, 0) rotate(${swipeOffset * 0.04}deg)`,
                transition: (isDragging || isResetting) ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                willChange: "transform",
                zIndex: 10
              }}
            >
              <Image
                src={activePost.imageData}
                alt="Uploaded Fashion Style"
                fill
                className="object-cover pointer-events-none"
                unoptimized
              />

              {/* 스와이프 시 나타나는 방향성 피드백 뱃지 */}
              {swipeOffset > 20 && (
                <div 
                  className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center pointer-events-none transition-opacity"
                  style={{ opacity: Math.min(0.8, swipeOffset / 100) }}
                >
                  <div className="bg-white/90 p-5 rounded-full shadow-lg transform scale-110">
                    <ThumbsUp className="w-12 h-12 text-emerald-500 fill-emerald-500" />
                  </div>
                </div>
              )}
              {swipeOffset < -20 && (
                <div 
                  className="absolute inset-0 bg-rose-500/10 flex items-center justify-center pointer-events-none transition-opacity"
                  style={{ opacity: Math.min(0.8, Math.abs(swipeOffset) / 100) }}
                >
                  <div className="bg-white/90 p-5 rounded-full shadow-lg transform scale-110">
                    <ThumbsDown className="w-12 h-12 text-rose-500 fill-rose-500" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 🔘 [2] 튜토리얼 오버레이 */}
          {showTutorial && !showExitModal && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-between p-8 text-white select-none">
              <div />

              <div className="flex flex-col items-center justify-center my-auto">
                <div className="flex items-center justify-center gap-7">
                  <ThumbsDown className="w-11 h-11 text-white" strokeWidth={1.5} />
                  
                  <div className="flex items-center gap-1 text-white/80">
                    <span className="text-xl font-light">←</span>
                    <span className="h-[2px] w-20 bg-white block" />
                    <span className="text-xl font-light">→</span>
                  </div>

                  <ThumbsUp className="w-11 h-11 text-white" strokeWidth={1.5} />
                </div>

                <h2 className="text-2xl font-bold mt-8 text-center tracking-wide leading-snug">
                  쭈업은 오른쪽, 쭈따는 왼쪽
                </h2>
                <p className="text-sm text-zinc-300 mt-2 text-center">
                  좌우로 화면을 밀어봐요
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-[320px] mx-auto pb-4">
                <button
                  onClick={handleConfirmTutorial}
                  className="w-full py-4 bg-[#545454] text-white rounded-xl font-bold text-center active:scale-95 transition-transform"
                >
                  확인
                </button>
                <button
                  onClick={handleHideTutorialForever}
                  className="w-full py-4 bg-white text-black rounded-xl font-bold text-center active:scale-95 transition-transform shadow-lg"
                >
                  더이상 보지 않기
                </button>
              </div>
            </div>
          )}

          {/* 🎁 [수정사항] 기획안 스펙과 100% 일치하도록 수정한 '쭈템프 획득 최종 모달' */}
          {showExitModal && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
              <div className="w-full max-w-[320px] bg-white rounded-[40px] px-6 py-10 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-200">
                
                {/* 타이틀 및 리워드 스탬프 개수 */}
                <h3 className="text-2xl font-black text-[#111111] text-center tracking-tight">
                  쭈템프 {stampsEarned}개 획득
                </h3>
                
                {/* 서브 설명 문구 */}
                <p className="text-sm font-medium text-zinc-400 mt-3 mb-10 text-center leading-relaxed">
                  총 {completedCount}명의 쭈꾸미에게<br />피드백을 전달했어요
                </p>

                {/* 둥근 형태의 버튼 세트 */}
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={handleContinueFeedback}
                    className="w-full py-4 bg-[#4d4d4d] hover:bg-[#3d3d3d] active:scale-95 text-white rounded-full font-bold text-sm text-center transition-all shadow-md"
                  >
                    계속 진행 하기
                  </button>
                  <button
                    onClick={handleExitFeedback}
                    className="w-full py-4 bg-[#eaeaea] hover:bg-[#dedede] active:scale-95 text-[#111111] rounded-full font-bold text-sm text-center transition-all"
                  >
                    나가기
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* 하단 세이프티 가이드라인 바 */}
        <div className="h-8 w-full flex justify-center items-center select-none pb-2">
          <div className="w-36 h-1 bg-black rounded-full" />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // 🌌 [3] 기본 3D 터널 은하수 탐색 레이아웃
  // -------------------------------------------------------------
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-y-auto overflow-x-hidden select-none bg-white scrollbar-none"
      style={{ touchAction: "pan-y" }}
    >
      {/* 📜 가상 스페이스 레일 */}
      <div 
        className="w-full pointer-events-none" 
        style={{ height: `${100 + userPosts.length * 45}vh` }} 
      />

      {/* 📌 고정 3D 시점 카메라 프레임 */}
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
          const rotateZ = (i % 2 === 0 ? 6 : -6) + Math.sin(i) * 6

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
              onClick={() => handleCardClick(i)} // 카드 클릭 시 스와이프 모드 트리거
              className="absolute w-[220px] h-[290px] origin-center pointer-events-auto cursor-pointer"
              style={{
                transform: `translate3d(${translateX}px, ${translateY}px, ${currentZ * 0.4}px) scale(${scale}) rotateZ(${rotateZ}deg)`,
                zIndex: 1000 - i,
                opacity: opacity,
                willChange: "transform, opacity",
                backfaceVisibility: "hidden"
              }}
            >
              <div className="relative w-full h-full bg-white rounded-[12px] overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.06)] border border-zinc-200/40">
                <Image 
                  src={post.imageData} 
                  alt="Style Space Element" 
                  fill 
                  className="object-cover" 
                  unoptimized 
                />

                {/* 최신 포스트 뉴 배지 */}
                {i === 0 && (
                  <div className="absolute -top-2 -right-3 px-2 py-1 bg-[#111111] rounded-sm">
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