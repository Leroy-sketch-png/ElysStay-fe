/**
 * Unified Motion System — Single source of truth for all animations.
 *
 * Only exports that are actually consumed are kept here.
 * Add new presets as features need them — don't pre-build unused variants.
 */

// ─── Spring Physics ──────────────────────────────────────

export const SPRING = { stiffness: 400, damping: 17, mass: 0.5 } as const

// ─── Stagger Configuration ──────────────────────────────

export const STAGGER_CONFIG = {
	fast: 0.03,
	normal: 0.05,
	slow: 0.1,
} as const

// ─── Transition Presets ──────────────────────────────────

export const TRANSITION_SPRING = { type: 'spring' as const, ...SPRING }

// ─── Stagger Container + Item ────────────────────────────

export const staggerContainer = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.05, delayChildren: 0.1 },
	},
}

export const staggerItem = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0, transition: TRANSITION_SPRING },
}
