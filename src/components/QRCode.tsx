'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeProps {
  url: string
  size?: number
  className?: string
}

export default function QRCodeComponent({ url, size = 64, className = '' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && url) {
      // Check if user prefers dark mode
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches

      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 1,
        color: {
          dark: isDarkMode ? '#fafafa' : '#000000',
          light: isDarkMode ? '#18181b' : '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR Code generation error:', error)
      })
    }
  }, [url, size])

  return (
    <div className={`bg-card p-2 rounded-lg shadow-md ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  )
}