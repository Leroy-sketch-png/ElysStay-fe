'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Portal } from './portal'
import { Button } from './button'

// ─── Dialog Context ─────────────────────────────────────

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error('Dialog components must be used within a Dialog')
  return ctx
}

// ─── Dialog Root ────────────────────────────────────────

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  // Lock body scroll
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

// ─── Dialog Content ─────────────────────────────────────

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

function DialogContent({ className, children, size = 'md', ...props }: DialogContentProps) {
  const { open, onOpenChange } = useDialogContext()
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Focus trap
  React.useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const focusable = contentRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      focusable?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [open])

  if (!open) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)]',
  }

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className='fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-in fade-in-0'
        onClick={() => onOpenChange(false)}
        aria-hidden='true'
      />
      {/* Content */}
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
        <div
          ref={contentRef}
          role='dialog'
          aria-modal='true'
          className={cn(
            'relative w-full rounded-xl border bg-background shadow-lg animate-slideInUp',
            'max-h-[85vh] overflow-y-auto',
            sizeClasses[size],
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
        </div>
      </div>
    </Portal>
  )
}

// ─── Dialog Header ──────────────────────────────────────

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 px-6 pt-6', className)} {...props} />
  )
}

// ─── Dialog Title ───────────────────────────────────────

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
}

// ─── Dialog Description ─────────────────────────────────

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
}

// ─── Dialog Body ────────────────────────────────────────

function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props} />
}

// ─── Dialog Footer ──────────────────────────────────────

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

// ─── Dialog Close ───────────────────────────────────────

function DialogClose({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { onOpenChange } = useDialogContext()
  return (
    <Button
      variant='ghost'
      size='icon'
      className={cn('absolute right-3 top-3 size-8 rounded-full', className)}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      <X className='size-4' />
      <span className='sr-only'>Close</span>
    </Button>
  )
}

// ─── Confirm Dialog ─────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  onConfirm: () => void
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='sm'>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className='pt-4'>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
  ConfirmDialog,
}
