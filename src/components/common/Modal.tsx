import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto no-print">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Box */}
        <div
          className={`relative w-full ${widthClasses} transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all border border-stone-200`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/80 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-md border border-stone-200 shrink-0 shadow-2xs">
                <img
                  src="./assets/aistudio/sativa_b7dc1d13.webp"
                  alt="Sativa"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-900">{title}</h3>
                {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[80vh] overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
};
