/**
 * Unified Motion System — Single source of truth for all animations.
 */

// ─── Spring Physics ──────────────────────────────────────

export const SPRING = { stiffness: 400, damping: 17, mass: 0.5 } as const
export const SPRING_SMOOTH = { stiffness: 300, damping: 20, mass: 0.8 } as const
export const SPRING_BOUNCY = { stiffness: 500, damping: 15, mass: 0.3 } as const

// ─── Duration Constants (ms) ─────────────────────────────

export const DURATIONS = {
	instant: 75,
	fast: 150,
	normal: 200,
	smooth: 300,
	slow: 500,
	verySlow: 700,
} as const

// ─── Easing Functions ────────────────────────────────────

export const EASINGS = {
	bounce: [0.68, -0.55, 0.265, 1.55],
	smooth: [0.25, 0.8, 0.25, 1],
	sharp: [0.4, 0, 0.2, 1],
	ease: [0.4, 0, 0.6, 1],
} as const

// ─── Common Variants ─────────────────────────────────────

export const FADE_IN_VARIANTS = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
} as const

export const SCALE_IN_VARIANTS = {
	hidden: { opacity: 0, scale: 0.8 },
	visible: { opacity: 1, scale: 1 },
} as const

export const SLIDE_IN_VARIANTS = {
	hidden: { opacity: 0, x: -20 },
	visible: { opacity: 1, x: 0 },
} as const

// ─── Stagger Configuration ──────────────────────────────

export const STAGGER_CONFIG = {
	fast: 0.03,
	normal: 0.05,
	slow: 0.1,
} as const

// ─── Interactive States ──────────────────────────────────

export const BUTTON_HOVER = { scale: 1.05, y: -2 } as const
export const BUTTON_TAP = { scale: 0.98, y: 0 } as const
export const BUTTON_SUBTLE_HOVER = { scale: 1.05 } as const
export const BUTTON_SUBTLE_TAP = { scale: 0.95 } as const

export const CARD_HOVER = { scale: 1.02, y: -4 } as const
export const CARD_FEED_HOVER = { y: -4 } as const
export const CARD_GRID_HOVER = { y: -6 } as const

export const STAT_ITEM_HOVER = { y: -2 } as const
export const ICON_BUTTON_HOVER = { scale: 1.1 } as const
export const ICON_BUTTON_TAP = { scale: 0.95 } as const

// ─── Transition Presets ──────────────────────────────────

export const TRANSITION_SPRING = { type: 'spring' as const, ...SPRING }
export const TRANSITION_SMOOTH = { type: 'spring' as const, ...SPRING_SMOOTH }
export const TRANSITION_BOUNCY = { type: 'spring' as const, ...SPRING_BOUNCY }

export const LAYOUT_TRANSITION = {
	type: 'spring' as const,
	stiffness: 350,
	damping: 25,
}

// ─── Page Transitions ────────────────────────────────────

export const PAGE_VARIANTS = {
	initial: { opacity: 0, y: 10 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -10 },
}

export const PAGE_TRANSITION = {
	duration: DURATIONS.smooth / 1000,
	ease: EASINGS.smooth,
}

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

export const fadeInUp = staggerItem

export const scaleIn = {
	hidden: { opacity: 0, scale: 0.8 },
	visible: { opacity: 1, scale: 1, transition: TRANSITION_SPRING },
}

// ─── Overlay / Modal ─────────────────────────────────────

export const OVERLAY_BACKDROP = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.2 } },
	exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const MODAL_ENTRANCE = {
	hidden: { scale: 0.5, opacity: 0, y: 50 },
	visible: {
		scale: 1,
		opacity: 1,
		y: 0,
		transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
	},
	exit: {
		scale: 0.9,
		opacity: 0,
		y: -20,
		transition: { duration: 0.2 },
	},
}

// ─── Utility ─────────────────────────────────────────────

export const getStaggerTransition = (
	index: number,
	stagger: number = STAGGER_CONFIG.normal,
) => ({
	...TRANSITION_SPRING,
	delay: index * stagger,
})
