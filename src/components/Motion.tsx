'use client'

import { type ReactNode } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  staggerContainer,
  staggerItem,
  TRANSITION_SPRING,
  STAGGER_CONFIG,
} from '@/lib/motion'

// ─── Stagger Container ─────────────────────────────────

interface StaggerContainerProps {
  children: ReactNode
  className?: string
  /** Stagger delay between children */
  stagger?: keyof typeof STAGGER_CONFIG
  /** Delay before the first child animates */
  delayChildren?: number
}

export function StaggerContainer({
  children,
  className,
  stagger = 'normal',
  delayChildren = 0.1,
}: StaggerContainerProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: STAGGER_CONFIG[stagger],
        delayChildren,
      },
    },
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial='hidden'
      animate='visible'
    >
      {children}
    </motion.div>
  )
}

// ─── Stagger Item ───────────────────────────────────────

interface StaggerItemProps {
  children: ReactNode
  className?: string
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}

// ─── Animated Card (hover lift) ─────────────────────────

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  /** Hover elevation in pixels */
  hoverY?: number
}

export function AnimatedCard({
  children,
  className,
  hoverY = 0,
}: AnimatedCardProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={staggerItem}
      whileHover={hoverY !== 0 ? { y: hoverY, transition: { duration: 0.15 } } : undefined}
    >
      {children}
    </motion.div>
  )
}

// ─── Page Transition Wrapper ────────────────────────────

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.8, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}
