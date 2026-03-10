'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
	hasError: boolean
	error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
	public state: State = { hasError: false }

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('ErrorBoundary caught:', error, errorInfo)
		this.props.onError?.(error, errorInfo)
	}

	private handleReset = () => {
		this.setState({ hasError: false, error: undefined })
	}

	public render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback

			return (
				<div className='flex min-h-[300px] items-center justify-center p-6'>
					<div className='max-w-md text-center'>
						<h2 className='mb-2 text-lg font-bold'>Something went wrong</h2>
						<p className='mb-4 text-sm text-muted-foreground'>
							{this.state.error?.message || 'An unexpected error occurred.'}
						</p>
						<button
							onClick={this.handleReset}
							className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
						>
							Try Again
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
