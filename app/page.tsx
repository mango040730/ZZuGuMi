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
        const updatedPosts = [newPost, ...prevPosts]
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
      {/* 💡 배경색을 bg-[#f3f3f1] 에서 bg-white 로 변경했습니다. */}
      <main 
        className={`relative min-h-screen w-full max-w-md mx-auto bg-white overflow-hidden transition-opacity duration-300 ${
          currentScreen !== "home" ? "opacity-0" : "opacity-100"
        }`}
      >
        <Header />
        <div className="relative h-[calc(100vh-80px)]">
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