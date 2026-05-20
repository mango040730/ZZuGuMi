"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/home/header"
import { FloatingCards, type Post } from "@/components/home/floating-cards"
import { CameraButton } from "@/components/home/camera-button"
import { CameraScreen } from "@/components/camera/camera-screen"
import { UploadPreviewScreen } from "@/components/upload-preview-screen"

type Screen = "home" | "camera" | "preview"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isTransitioning, setIsTransitioning] = useState(false)

  // 1. 앱이 처음 켜질 때 브라우저 저장소(localStorage)에서 기존 사진 가져오기
  useEffect(() => {
    const savedPosts = localStorage.getItem("zzuggumi_posts")
    if (savedPosts) {
      try {
        const parsedPosts = JSON.parse(savedPosts) as Post[]
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000
        const now = Date.now()
        
        // 가져오는 순간에도 이미 12시간이 지난 사진이 있다면 걸러내기
        const validPosts = parsedPosts.filter(post => (now - post.createdAt) < TWELVE_HOURS_MS)
        setPosts(validPosts)
        localStorage.setItem("zzuggumi_posts", JSON.stringify(validPosts))
      } catch (e) {
        console.error("저장된 데이터를 불러오는 중 오류 발생:", e)
      }
    }
  }, [])

  // 2. 주기적으로 12시간 지난 포스트 감지해서 삭제하기 (1분마다 체크)
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
  
  // 3. 업로드할 때 브라우저 저장소에도 함께 저장하기
  const handleUpload = (questionText: string, mergedImage?: string) => {
    if (capturedImage || mergedImage) {
      const newPost: Post = {
        id: Date.now().toString(),
        imageData: mergedImage || capturedImage || "",
        questionText,
        createdAt: Date.now()
      }
      
      setIsTransitioning(true)
      setPosts(prevPosts => {
        const updatedPosts = [newPost, ...prevPosts]
        // 브라우저 저장소에 영구 보존(새로고침 대비)
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
        className={`relative min-h-screen w-full max-w-md mx-auto bg-[#f3f3f1] overflow-hidden transition-opacity duration-300 ${
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