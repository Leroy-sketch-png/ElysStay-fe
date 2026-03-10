'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const toastVariants = cva(
	'group pointer-events-auto relative flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs shadow-sm transition-all duration-200 animate-slideInUp bg-background/95 backdrop-blur-sm border border-border',
	{
		variants: {
			variant: {
				default: 'text-muted-foreground',
				success: 'text-muted-foreground [&>.toast-dot]:bg-green-500',
				error: 'text-muted-foreground [&>.toast-dot]:bg-destructive',
				warning: 'text-muted-foreground [&>.toast-dot]:bg-amber-500',
				info: 'text-muted-foreground [&>.toast-dot]:bg-blue-500',
			},
		},
		defaultVariants: { variant: 'default' },
	},
)

export interface ToastProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof toastVariants> {
	title?: string
	description?: string
	action?: { label: string; onClick: () => void }
	onClose?: () => void
	duration?: number
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
	({ className, variant = 'default', title, description, children, action, onClose, duration = 5000, ...props }, ref) => {
		const [isVisible, setIsVisible] = React.useState(true)
		const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

		React.useEffect(() => {
			if (duration > 0) {
				timerRef.current = setTimeout(() => {
					setIsVisible(false)
					setTimeout(() => onClose?.(), 200)
				}, duration)
			}
			return () => { if (timerRef.current) clearTimeout(timerRef.current) }
		}, [duration, onClose])

		const handleClose = () => {
			setIsVisible(false)
			setTimeout(() => onClose?.(), 200)
		}

		const showDot = variant !== 'default'

		return (
			<div
				ref={ref}
				className={cn(toastVariants({ variant }), !isVisible && 'translate-y-2 opacity-0', className)}
				{...props}
			>
				{showDot && <span className='toast-dot size-1.5 flex-shrink-0 rounded-full' />}
				<span className='flex-1 truncate'>
					{title}
					{description && <span className='ml-1 opacity-70'>{description}</span>}
					{children}
				</span>
				{action && (
					<button onClick={action.onClick} className='flex-shrink-0 font-medium text-primary hover:underline'>
						{action.label}
					</button>
				)}
				{onClose && (
					<button
						onClick={handleClose}
						className='flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100'
						aria-label='Close'
					>
						<X className='size-3' />
					</button>
				)}
			</div>
		)
	},
)
Toast.displayName = 'Toast'

export { toastVariants }
