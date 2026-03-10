'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Tabs Context ───────────────────────────────────────

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used within Tabs')
  return ctx
}

// ─── Tabs Root ──────────────────────────────────────────

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

// ─── Tab List ───────────────────────────────────────────

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role='tablist'
      className={cn(
        'inline-flex h-10 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

// ─── Tab Trigger ────────────────────────────────────────

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ value: tabValue, className, ...props }: TabsTriggerProps) {
  const { value, onValueChange } = useTabsContext()
  const isActive = value === tabValue

  return (
    <button
      role='tab'
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive && 'bg-background text-foreground shadow-sm',
        !isActive && 'hover:bg-background/50 hover:text-foreground',
        className,
      )}
      onClick={() => onValueChange(tabValue)}
      {...props}
    />
  )
}

// ─── Tab Content ────────────────────────────────────────

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ value: tabValue, className, ...props }: TabsContentProps) {
  const { value } = useTabsContext()
  if (value !== tabValue) return null

  return (
    <div
      role='tabpanel'
      data-state={value === tabValue ? 'active' : 'inactive'}
      className={cn('mt-4 ring-offset-background focus-visible:outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
