import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Button } from './button'

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			role='group'
			className={cn(
				'group/input-group border-input relative flex w-full items-center rounded-md border shadow-sm transition-[color,box-shadow] outline-none',
				'h-9 min-w-0 has-[>textarea]:h-auto',
				'has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-start]]:[&>textarea]:pl-2',
				'has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=inline-end]]:[&>textarea]:pr-2',
				'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-offset-2 has-[[data-slot=input-group-control]:focus-visible]:ring-offset-background',
				'has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive/20',
				className,
			)}
			{...props}
		/>
	)
}

const inputGroupAddonVariants = cva(
	'text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium select-none [&>svg:not([class*=size-])]:size-4 [&>kbd]:rounded-[calc(var(--radius)-5px)]',
	{
		variants: {
			align: {
				'inline-start': 'order-first pl-3',
				'inline-end': 'order-last pr-3',
				'block-start': 'order-first w-full justify-start px-3 pt-3',
				'block-end': 'order-last w-full justify-start px-3 pb-3',
			},
		},
		defaultVariants: {
			align: 'inline-start',
		},
	},
)

function InputGroupAddon({
	className,
	align = 'inline-start',
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
	return (
		<div
			data-align={align}
			className={cn(inputGroupAddonVariants({ align }), className)}
			onClick={event => {
				if ((event.target as HTMLElement).closest('button')) {
					return
				}

				const el = event.currentTarget.parentElement
					?.querySelector<HTMLElement>('input, textarea')
				el?.focus()
			}}
			{...props}
		/>
	)
}

const inputGroupButtonVariants = cva('text-sm shadow-none flex gap-2 items-center', {
	variants: {
		size: {
			xs: 'h-6 gap-1 px-2 rounded-[calc(var(--radius)-5px)] [&>svg:not([class*=size-])]:size-3.5',
			sm: 'h-8 px-2.5 gap-1.5 rounded-md',
			'icon-xs': 'size-6 rounded-[calc(var(--radius)-5px)] p-0',
			'icon-sm': 'size-8 p-0',
		},
	},
	defaultVariants: {
		size: 'xs',
	},
})

function InputGroupButton({
	className,
	type = 'button',
	variant = 'ghost',
	size = 'xs',
	...props
}: Omit<React.ComponentProps<typeof Button>, 'size'> &
	VariantProps<typeof inputGroupButtonVariants>) {
	return (
		<Button
			type={type}
			variant={variant}
			className={cn(inputGroupButtonVariants({ size }), className)}
			{...props}
		/>
	)
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			className={cn(
				'text-muted-foreground flex items-center gap-2 text-sm [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4',
				className,
			)}
			{...props}
		/>
	)
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
	return (
		<input
			data-slot='input-group-control'
			className={cn(
				'flex h-9 w-full rounded-none border-0 bg-transparent px-3 py-2 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0',
				className,
			)}
			{...props}
		/>
	)
}

function InputGroupTextarea({
	className,
	...props
}: React.ComponentProps<'textarea'>) {
	return (
		<textarea
			data-slot='input-group-control'
			className={cn(
				'flex min-h-24 w-full resize-none rounded-none border-0 bg-transparent px-3 py-3 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0',
				className,
			)}
			{...props}
		/>
	)
}

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
}
