'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  /** The key to listen for (e.g. 'k', 'Escape', '/') */
  key: string
  /** Modifier keys (default: none) */
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  /** Handler function */
  handler: (e: KeyboardEvent) => void
  /** Only fire when no input/textarea is focused */
  ignoreInputs?: boolean
}

/**
 * Declarative keyboard shortcuts hook.
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'k', ctrl: true, handler: () => openSearch() },
 *   { key: 'Escape', handler: () => closePanel() },
 * ])
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handler = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcutsRef.current) {
      const keyMatch =
        e.key.toLowerCase() === shortcut.key.toLowerCase() ||
        e.code.toLowerCase() === `key${shortcut.key.toLowerCase()}`

      if (!keyMatch) continue

      const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.alt ? e.altKey : !e.altKey

      if (!ctrlMatch || !shiftMatch || !altMatch) continue

      // Skip if user is typing in an input
      if (shortcut.ignoreInputs !== false) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') continue
        if ((e.target as HTMLElement)?.isContentEditable) continue
      }

      e.preventDefault()
      shortcut.handler(e)
      return
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler])
}
