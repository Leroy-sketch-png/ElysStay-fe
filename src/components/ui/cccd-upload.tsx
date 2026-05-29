'use client'

import * as React from 'react'
import { UploadCloud, FileImage, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'

interface CCCDUploadProps {
  frontImage?: string
  backImage?: string
  onChange?: (type: 'front' | 'back', url: string) => void
  disabled?: boolean
}

export function CCCDUpload({ frontImage, backImage, onChange, disabled }: CCCDUploadProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 mt-4">
      <DragDropArea 
        label="Mặt trước CCCD" 
        value={frontImage} 
        disabled={disabled} 
        onUpload={(url) => onChange?.('front', url)}
      />
      <DragDropArea 
        label="Mặt sau CCCD" 
        value={backImage} 
        disabled={disabled} 
        onUpload={(url) => onChange?.('back', url)}
      />
    </div>
  )
}

function DragDropArea({ label, value, disabled, onUpload }: { label: string, value?: string, disabled?: boolean, onUpload: (url: string) => void }) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (disabled) return
    setIsUploading(true)
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      const url = URL.createObjectURL(file)
      onUpload(url)
      toast.success(`Đã tải lên ${label}`)
    } catch (err) {
      toast.error(`Không thể tải lên ${label}`)
    } finally {
      setIsUploading(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors overflow-hidden ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} h-40`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && !isUploading && !value && inputRef.current?.click()}
      >
        <AnimatePresence mode="wait">
          {value ? (
            <motion.div 
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full"
            >
              <img src={value} alt={label} className="w-full h-full object-cover" />
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); onUpload('') }}>
                    <X className="size-4" />
                    Xóa
                  </Button>
                </div>
              )}
            </motion.div>
          ) : isUploading ? (
            <motion.div key="uploading" className="flex flex-col items-center text-primary" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Loader2 className="size-8 animate-spin mb-2" />
              <span className="text-sm">Đang tải lên...</span>
            </motion.div>
          ) : (
            <motion.div key="empty" className="flex flex-col items-center text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <UploadCloud className={`size-8 mb-2 ${isDragging ? 'text-primary' : ''}`} />
              <span className="text-sm font-medium">Kéo thả hoặc nhấn để tải lên</span>
              <span className="text-xs mt-1">Hỗ trợ JPG, PNG</span>
            </motion.div>
          )}
        </AnimatePresence>
        <input 
          type="file" 
          ref={inputRef} 
          onChange={onChange} 
          accept="image/*" 
          className="hidden" 
          disabled={disabled || isUploading}
        />
      </div>
    </div>
  )
}
