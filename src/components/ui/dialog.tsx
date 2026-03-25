'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Portal } from './portal'
import { Button } from './button'

// ─── Focus Trap Utilities ───────────────────────────────

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest('[aria-hidden="true"]') && el.offsetParent !== null,
  )
}

// ─── Dialog Context ─────────────────────────────────────

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  titleId: string
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
  const previousFocusRef = React.useRef<HTMLElement | null>(null)
  const titleId = React.useId()

  // Store the element that had focus before opening
  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
    }
  }, [open])

  // Restore focus on close
  React.useEffect(() => {
    if (!open && previousFocusRef.current) {
      const el = previousFocusRef.current
      previousFocusRef.current = null
      // Defer to next frame so the portal unmounts first
      requestAnimationFrame(() => {
        el?.focus?.()
      })
    }
  }, [open])

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
    <DialogContext.Provider value={{ open, onOpenChange, titleId }}>
      {children}
    </DialogContext.Provider>
  )
}

// ─── Dialog Content ─────────────────────────────────────

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

function DialogContent({ className, children, size = 'md', ...props }: DialogContentProps) {
  const { open, onOpenChange, titleId } = useDialogContext()
  const contentRef = React.useRef<HTMLDivElement>(null)

  // Auto-focus first focusable element on open
  React.useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const focusable = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      focusable?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [open])

  // Focus trap: cycle Tab/Shift+Tab within dialog
  React.useEffect(() => {
    if (!open) return
    const container = contentRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = getFocusableElements(container)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
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
          aria-labelledby={titleId}
          className={cn(
            'relative w-full rounded-lg border bg-background shadow-lg animate-slideInUp',
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
  const { titleId } = useDialogContext()
  return (
    <h2 id={titleId} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
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
      <span className='sr-only'>Đóng</span>
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
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
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
            {loading ? 'Đang xử lý…' : confirmLabel}
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
