import { render, screen, fireEvent } from '@testing-library/react'
import { ReportPreviewDialog } from './report-preview-dialog'
import { vi, describe, it, expect } from 'vitest'

// Mock ReportPreview component
vi.mock('./report-preview', () => ({
  ReportPreview: ({ code, input }: { code: string; input: any }) => (
    <div data-testid="report-preview">
      Preview: {code} - {JSON.stringify(input)}
    </div>
  ),
}))

// Mock Dialog components from Shadcn/Radix
// Since we are using the actual component code which imports from @/components/ui/dialog,
// and those use Radix, they should work in JSDOM if ResizeObserver is mocked.
// However, Radix Dialog relies on pointer events and might need some setup.
// For unit testing the wrapper, simple mocks might be enough if we want to isolate from Radix complexity.
// But let's try to use the real ones first. If it fails, we mock them.

// Radix UI Dialog often needs ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}

describe('ReportPreviewDialog', () => {
  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    code: 'TEST_REPORT',
    input: { id: 123 },
  }

  it('renders content when open', () => {
    render(<ReportPreviewDialog {...defaultProps} />)
    expect(screen.getByText('Report Preview')).toBeInTheDocument()
    expect(screen.getByTestId('report-preview')).toBeInTheDocument()
    expect(screen.getByText(/TEST_REPORT/)).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(<ReportPreviewDialog {...defaultProps} isOpen={false} />)
    // Radix Dialog might render nothing or hidden content. 
    // Usually queryByText returns null.
    expect(screen.queryByText('Report Preview')).not.toBeInTheDocument()
  })

  it('displays custom title and description', () => {
    render(
      <ReportPreviewDialog
        {...defaultProps}
        title="Custom Title"
        description="Custom Description"
      />
    )
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom Description')).toBeInTheDocument()
  })

  it('calls onOpenChange when close button is clicked', () => {
    render(<ReportPreviewDialog {...defaultProps} />)
    const closeButton = screen.getByTitle('Close')
    fireEvent.click(closeButton)
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('toggles fullscreen mode', () => {
    render(<ReportPreviewDialog {...defaultProps} />)
    const fullscreenButton = screen.getByTitle('Fullscreen')

    // Initial state check (we can't easily check class names on DialogContent since it's portal-ed 
    // and we might need to look for specific elements. 
    // But we can check if the button icon changes or state updates if we had access.
    // Here we mainly check that it doesn't crash and button works.)

    fireEvent.click(fullscreenButton)
    // After click, title should change to "Exit Fullscreen"
    expect(screen.getByTitle('Exit Fullscreen')).toBeInTheDocument()

    const exitFullscreenButton = screen.getByTitle('Exit Fullscreen')
    fireEvent.click(exitFullscreenButton)
    expect(screen.getByTitle('Fullscreen')).toBeInTheDocument()
  })
})
