'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
	icon?: ReactNode
	title: string
	description: string
	actionLabel?: string
	onAction?: () => void
	actionHref?: string
	children?: ReactNode
	className?: string
}

export function EmptyState({
	icon,
	title,
	description,
	actionLabel,
	onAction,
	actionHref,
	children,
	className,
}: EmptyStateProps) {
	return (
		<div className={cn('flex min-h-[400px] flex-col items-center justify-center px-4 py-12', className)}>
			<div className='mx-auto max-w-md text-center'>
				{icon && (
					<div className='mb-6 flex justify-center'>
						<div className='rounded-full bg-primary/10 p-8'>
							{icon}
						</div>
					</div>
				)}

				<h3 className='mb-2 text-xl font-bold leading-tight'>{title}</h3>
				<p className='mb-6 leading-normal text-muted-foreground'>{description}</p>

				{children ? (
					children
				) : actionLabel ? (
					actionHref ? (
						<a
							href={actionHref}
							className='inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
						>
							{actionLabel}
						</a>
					) : (
						<button
							onClick={onAction}
							className='inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
						>
							{actionLabel}
						</button>
					)
				) : null}
			</div>
		</div>
	)
}
