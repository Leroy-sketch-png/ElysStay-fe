'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PasswordInput({
	className,
	...props
}: React.ComponentProps<'input'>) {
	const [showPassword, setShowPassword] = useState(false)

	return (
		<div className='relative'>
			<input
				type={showPassword ? 'text' : 'password'}
				placeholder='••••••••'
				className={cn(
					'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm',
					'file:border-0 file:bg-transparent file:text-sm file:font-medium',
					'placeholder:text-muted-foreground',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
					'disabled:cursor-not-allowed disabled:opacity-50',
					'pr-10',
					className,
				)}
				{...props}
			/>
			<button
				type='button'
				onClick={() => setShowPassword(!showPassword)}
				className='absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
			</button>
		</div>
	)
}
