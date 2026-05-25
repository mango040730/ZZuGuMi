"use client"

import { Camera } from "lucide-react"

interface CameraButtonProps {
  onClick?: () => void
}

export function CameraButton({ onClick }: CameraButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[72px] h-[72px] bg-[#FF6200] rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      aria-label="Upload outfit"
    >
      <Camera className="w-12 h-12 text-white" strokeWidth={2} />
    </button>
  )
}