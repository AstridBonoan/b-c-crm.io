import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in">
      <button
        type="button"
        className="fixed inset-0 bg-navy-deep/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col border border-line bg-white shadow-[var(--shadow-float)] sm:max-h-[calc(100vh-3rem)] animate-scale-in"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <h2 id="modal-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer ? (
            <div className="flex shrink-0 justify-end gap-2 border-t border-line px-4 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
