'use client'

import { WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Fixed bottom banner that appears when the user goes offline.
 * Automatically hides when connectivity is restored.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const prefersReduced = useReducedMotion()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          role='alert'
          aria-live='assertive'
          className='fixed bottom-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-warning px-4 py-2.5 text-sm font-medium text-warning-foreground shadow-lg'
          initial={prefersReduced ? { opacity: 0 } : { y: '100%' }}
          animate={prefersReduced ? { opacity: 1 } : { y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { y: '100%' }}
          transition={prefersReduced ? { duration: 0.15 } : { type: 'spring', stiffness: 400, damping: 30 }}
        >
          <WifiOff className='size-4' />
          <span>Bạn đang ngoại tuyến. Một số tính năng có thể không khả dụng.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
