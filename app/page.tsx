"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/home/header"
import { FloatingCards } from "@/components/home/floating-cards"
import { CameraButton } from "@/components/camera/camera-button"
import { CameraScreen } from "@/components/home/camera-screen"
import { UploadPreviewScreen } from "@/components/upload-preview-screen"
import { fetchPosts, createPost, updateVote } from "@/lib/posts"
import { supabase } from "@/lib/supabase"

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

  // 초기 로드
  useEffect(() => {
    fetchPosts().then(setPosts).catch(console.error)
  }, [])

  // 실시간: 다른 유저가 업로드하면 자동 반영
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        const row = payload.new as Record<string, unknown>
        const newPost: Post = {
          id: row.id as string,
          imageData: row.image_url as string,
          questionText: row.question_text as string,
          createdAt: row.created_at as number,
          poll: (row.poll as PollOption[]) ?? undefined,
        }
        setPosts(prev => {
          if (prev.some(p => p.id === newPost.id)) return prev
          return [newPost, ...prev]
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, payload => {
        const row = payload.new as Record<string, unknown>
        setPosts(prev => prev.map(p =>
          p.id === (row.id as string)
            ? { ...p, poll: (row.poll as PollOption[]) ?? undefined }
            : p
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleCameraOpen = () => setCurrentScreen("camera")

  const handleCapture = (imageData: string) => {
    setCapturedImage(imageData)
    setCurrentScreen("preview")
  }

  const handleUpload = async (questionText: string, mergedImage?: string, pollOptions?: string[]) => {
    const imageData = mergedImage || capturedImage
    if (!imageData) return

    const newPost: Post = {
      id: Date.now().toString(),
      imageData,
      questionText,
      createdAt: Date.now(),
      poll: pollOptions && pollOptions.length > 0
        ? pollOptions.map(text => ({ text, votes: 0 }))
        : undefined,
    }

    // 즉시 로컬에 반영 (낙관적 업데이트)
    setIsTransitioning(true)
    setPosts(prev => {
      let insertIndex = typeof window !== 'undefined' ? (window as any).zzuggumiInsertIndex : 0
      if (!insertIndex || insertIndex < 0) insertIndex = 0
      if (insertIndex > prev.length) insertIndex = prev.length
      const updated = [...prev]
      updated.splice(insertIndex, 0, newPost)
      return updated
    })
    setCapturedImage(null)
    setCurrentScreen("home")
    setTimeout(() => setIsTransitioning(false), 600)

    // 서버에 저장 (백그라운드)
    createPost(newPost, imageData).catch(console.error)
  }

  const handleVote = async (postId: string, _optionIndex: number, updatedPoll: PollOption[]) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, poll: updatedPoll } : p))
    updateVote(postId, updatedPoll).catch(console.error)
  }

  const handleClose = () => {
    setCapturedImage(null)
    setCurrentScreen("home")
  }

  return (
    <>
      <main
        className={`relative flex-1 flex flex-col w-full md:flex-none md:w-[390px] md:h-[844px] bg-white overflow-hidden transition-opacity duration-300 ${
          currentScreen !== "home" ? "opacity-0" : "opacity-100"
        }`}
      >
        <Header />
        <div className="relative flex-1 min-h-0">
          <FloatingCards userPosts={posts} onVote={handleVote} />
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
