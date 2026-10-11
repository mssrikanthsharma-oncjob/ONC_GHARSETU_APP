import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const sizeMap = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export default function Modal({ isOpen, title, onClose, children, size = 'md' }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Small delay so the transition plays on mount
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${sizeMap[size] || sizeMap.md} max-h-[90vh] flex flex-col transition-all duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white rounded-t-xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
