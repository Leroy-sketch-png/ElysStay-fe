/**
 * Layout Constants — Semantic tokens for layout dimensions, z-index, and breakpoints.
 */

export const Z_INDEX = {
	base: 0,
	dropdown: 10,
	sticky: 20,
	overlay: 30,
	modal: 40,
	notification: 50,
	tooltip: 60,
} as const

export const SIDEBAR = {
	expandedWidth: 256,
	collapsedWidth: 80,
	mobileBreakpoint: 768,
	toggleShortcut: 'Ctrl+B',
	storageKey: 'sidebar-collapsed',
} as const

export const HEADER = {
	height: 64,
	compactHeight: 48,
} as const

export const CONTAINER = {
	xs: 512,
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536,
	full: Infinity,
} as const

export const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536,
} as const

export const SECTION_SPACING = {
	pagePadding: 'px-4 md:px-6 lg:px-8',
	sectionGap: 'py-12 md:py-16 lg:py-20',
	sectionGapCompact: 'py-8 md:py-10 lg:py-12',
	contentPadding: 'py-6 md:py-8',
} as const

export const MOBILE_NAV = {
	height: 64,
	safeOffset: 'pb-20 md:pb-0',
} as const
