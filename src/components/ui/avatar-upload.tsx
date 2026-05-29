'use client'

import * as React from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/toaster'
import { motion, AnimatePresence } from 'framer-motion'

interface AvatarUploadProps {
  value?: string
  onChange?: (url: string) => void
  disabled?: boolean
}

export function AvatarUpload({ value, onChange, disabled }: AvatarUploadProps) {
  const [isHovering, setIsHovering] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Simulate upload delay for UI polish
    setIsUploading(true)
    try {
      // In a real app, we would upload to a bucket. 
      // For now, we simulate and generate an object URL.
      await new Promise(resolve => setTimeout(resolve, 1500))
      const url = URL.createObjectURL(file)
      onChange?.(url)
      toast.success('Đã tải lên ảnh đại diện')
    } catch (err) {
      toast.error('Không thể tải lên ảnh')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="relative group inline-flex">
      <div 
        className={`relative size-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center transition-all ${!disabled ? 'cursor-pointer hover:border-primary/50' : 'opacity-70'}`}
        onMouseEnter={() => !disabled && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-medium text-muted-foreground uppercase">
            {/* Placeholder initial */}
            A
          </span>
        )}
        
        <AnimatePresence>
          {isHovering && !disabled && !isUploading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center"
            >
              <Camera className="size-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {isUploading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        accept="image/jpeg, image/png, image/webp" 
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  )
}
