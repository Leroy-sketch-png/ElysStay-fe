'use client'

import { WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Fixed bottom banner that appears when the user goes offline.
 * Automatically hides when connectivity is restored.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          role='alert'
          aria-live='assertive'
          className='fixed bottom-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg'
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <WifiOff className='size-4' />
          <span>You are offline. Some features may be unavailable.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
