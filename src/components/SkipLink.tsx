'use client'

/**
 * SkipLink — visually hidden link that becomes visible on focus,
 * allowing keyboard users to jump directly to the main content.
 */
export function SkipLink() {
  return (
    <a
      href='#main-content'
      className='sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
    >
      Chuyển đến nội dung chính
    </a>
  )
}
