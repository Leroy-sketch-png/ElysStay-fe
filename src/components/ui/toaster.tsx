'use client'

import * as React from 'react'
import { Toast, type ToastProps } from '@/components/ui/toast'
import { Portal } from '@/components/ui/portal'
import { cn } from '@/lib/utils'

export interface ToastConfig extends ToastProps {
	id: string
}

interface ToasterProps {
	position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
	maxToasts?: number
}

// ── Global state ──────────────────────────────

let toastCounter = 0
const listeners = new Set<(toasts: ToastConfig[]) => void>()
let toasts: ToastConfig[] = []

const notify = () => listeners.forEach(l => l([...toasts]))

const add = (config: Omit<ToastConfig, 'id'>) => {
	const id = `toast-${++toastCounter}`
	toasts.push({ id, ...config })
	notify()
	return id
}

export const toast = {
	success: (title: string, description?: string, opts?: Partial<ToastConfig>) =>
		add({ variant: 'success', title, description, ...opts }),

	error: (title: string, description?: string, opts?: Partial<ToastConfig>) =>
		add({ variant: 'error', title, description, duration: 7000, ...opts }),

	warning: (title: string, description?: string, opts?: Partial<ToastConfig>) =>
		add({ variant: 'warning', title, description, ...opts }),

	info: (title: string, description?: string, opts?: Partial<ToastConfig>) =>
		add({ variant: 'info', title, description, ...opts }),

	custom: (config: Omit<ToastConfig, 'id'>) => add(config),

	promise: async <T,>(
		promise: Promise<T>,
		messages: {
			loading: string
			success: string | ((data: T) => string)
			error: string | ((err: unknown) => string)
		},
	) => {
		const id = add({ variant: 'info', title: messages.loading, duration: 0 })
		try {
			const data = await promise
			const idx = toasts.findIndex(t => t.id === id)
			if (idx !== -1) {
				toasts[idx] = {
					id,
					variant: 'success',
					title: typeof messages.success === 'function' ? messages.success(data) : messages.success,
					duration: 5000,
				}
				notify()
			}
			return data
		} catch (err) {
			const idx = toasts.findIndex(t => t.id === id)
			if (idx !== -1) {
				toasts[idx] = {
					id,
					variant: 'error',
					title: typeof messages.error === 'function' ? messages.error(err) : messages.error,
					duration: 7000,
				}
				notify()
			}
			throw err
		}
	},

	dismiss: (id: string) => { toasts = toasts.filter(t => t.id !== id); notify() },
	dismissAll: () => { toasts = []; notify() },
}

// ── Component ─────────────────────────────────

export function Toaster({ position = 'bottom-right', maxToasts = 3 }: ToasterProps) {
	const [current, setCurrent] = React.useState<ToastConfig[]>([])

	React.useEffect(() => {
		listeners.add(setCurrent)
		return () => { listeners.delete(setCurrent) }
	}, [])

	const visible = current.slice(-maxToasts)

	const positionClasses: Record<string, string> = {
		'top-right': 'top-0 right-0 flex-col',
		'top-left': 'top-0 left-0 flex-col',
		'bottom-right': 'bottom-0 right-0 flex-col-reverse',
		'bottom-left': 'bottom-0 left-0 flex-col-reverse',
		'top-center': 'top-0 left-1/2 -translate-x-1/2 flex-col items-center',
		'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2 flex-col-reverse items-center',
	}

	if (visible.length === 0) return null

	return (
		<Portal>
			<div aria-live='polite' aria-relevant='additions removals' className={cn('pointer-events-none fixed z-50 flex max-h-screen w-full gap-3 p-4 md:max-w-sm', positionClasses[position])}>
				{visible.map(cfg => (
					<Toast key={cfg.id} {...cfg} onClose={() => toast.dismiss(cfg.id)} />
				))}
			</div>
		</Portal>
	)
}
