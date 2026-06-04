"use client"

import { User } from "lucide-react"

export function Header() {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-4 bg-white sticky top-0 z-40 border-b border-zinc-100">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        ZZuGGUM<span className="text-[#FF6200]">i</span>
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