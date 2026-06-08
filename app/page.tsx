"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/home/header"
import { FloatingCards } from "@/components/home/floating-cards"
import { CameraButton } from "@/components/camera/camera-button"
import { CameraScreen } from "@/components/home/camera-screen"
import { UploadPreviewScreen } from "@/components/upload-preview-screen"

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

type Screen = "home" | "camera" | "preview"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const savedPosts = localStorage.getItem("zzuggumi_posts")
    if (savedPosts) {
      try {
        const parsedPosts = JSON.parse(savedPosts) as Post[]
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
        const now = Date.now()
        
        const validPosts = parsedPosts.filter(post => (now - post.createdAt) < TWELVE_HOURS_MS)
        setPosts(validPosts)
        localStorage.setItem("zzuggumi_posts", JSON.stringify(validPosts))
      } catch (e) {
        console.error("저장된 데이터를 불러오는 중 오류 발생:", e)
      }
    }
  }, [])

  useEffect(() => {
    const checkExpiration = () => {
      const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
      const now = Date.now()

      setPosts(prevPosts => {
        const filtered = prevPosts.filter(post => (now - post.createdAt) < TWELVE_HOURS_MS)
        if (filtered.length !== prevPosts.length) {
          localStorage.setItem("zzuggumi_posts", JSON.stringify(filtered))
          return filtered
        }
        return prevPosts
      })
    }

    checkExpiration()
    const interval = setInterval(checkExpiration, 60000)

    return () => clearInterval(interval)
  }, [])

  const handleCameraOpen = () => setCurrentScreen("camera")
  
  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData)
    setCurrentScreen("preview")
  }
  
  const handleUpload = (questionText: string, mergedImage?: string, pollOptions?: string[]) => {
    if (capturedImage || mergedImage) {
      const newPost: Post = {
        id: Date.now().toString(),
        imageData: mergedImage || capturedImage || "",
        questionText,
        createdAt: Date.now(),
        poll: pollOptions && pollOptions.length > 0 
          ? pollOptions.map(text => ({ text, votes: 0 })) 
          : undefined
      }
      
      setIsTransitioning(true)
      setPosts(prevPosts => {
        // 💡 핵심: floating-cards에서 실시간으로 계산해둔 '화면 정중앙' 인덱스를 가져옵니다.
        let insertIndex = typeof window !== 'undefined' ? (window as any).zzuggumiInsertIndex : 0;
        if (insertIndex === undefined || insertIndex < 0) insertIndex = 0;
        if (insertIndex > prevPosts.length) insertIndex = prevPosts.length;

        const updatedPosts = [...prevPosts]
        // 정중앙 위치에 새 사진을 정확히 삽입
        updatedPosts.splice(insertIndex, 0, newPost)

        localStorage.setItem("zzuggumi_posts", JSON.stringify(updatedPosts))
        return updatedPosts
      })
      setCapturedImage(null)
      setCurrentScreen("home")
      
      setTimeout(() => setIsTransitioning(false), 600)
    }
  }
  
  const handleClose = () => {
    setCapturedImage(null)
    setCurrentScreen("home")
  }

  return (
    <>
      <main
        className={`relative flex flex-col w-[390px] h-[844px] bg-white overflow-hidden transition-opacity duration-300 ${
          currentScreen !== "home" ? "opacity-0" : "opacity-100"
        }`}
      >
        <Header />
        <div className="relative flex-1 min-h-0">
          <FloatingCards userPosts={posts} />
        </div>
        <CameraButton onClick={handleCameraOpen} />
      </main>

      {currentScreen === "camera" && (
        <CameraScreen onClose={handleClose} onCapture={handleCapture} />
      )}

      {currentScreen === "preview" && (
        <UploadPreviewScreen
          onClose={handleClose}
          onUpload={handleUpload}
          capturedImage={capturedImage || undefined}
        />
      )}
    </>
  )
}