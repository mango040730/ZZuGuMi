"use client"

import { User } from "lucide-react"

export function Header() {
  return (
    // 헤더 배경을 흰색(bg-white)으로 지정하고, 스크롤 시 상단에 깔끔하게 밀착 고정되도록 설정을 보완했습니다.
    <header className="flex items-center justify-between px-5 pt-5 pb-4 bg-white sticky top-0 z-40 border-b border-zinc-100">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        ZZuGGUMi
      </h1>
      <button 
        className="w-8 h-8 rounded-full border-[2.5px] border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Profile"
      >
        <User className="w-6 h-6" strokeWidth={2.5} />
      </button>
    </header>
  )
}