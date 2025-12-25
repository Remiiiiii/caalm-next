'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ContractCarousel from './ContractCarousel';
import type { UIFileDoc } from '@/types/files';

interface ContractExpiryModalProps {
  contracts: UIFileDoc[];
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: () => void;
}

export default function ContractExpiryModal({
  contracts,
  isOpen,
  onClose,
  onStatusChange,
}: ContractExpiryModalProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Desktop-only check
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024); // lg breakpoint
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Store the previously active element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the modal
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    if (firstElement) {
      firstElement.focus();
    }

    // Handle tab navigation within modal
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const elements = Array.from(focusableElements) as HTMLElement[];
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleTab);
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Don't render on mobile
  if (!isDesktop) {
    return null;
  }

  if (!isOpen || contracts.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contract-expiry-modal-title"
          aria-describedby="contract-expiry-modal-description"
        >
          {/* Light backdrop - allows Spline scene to show through */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-white/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Content */}
          <div
            ref={modalRef}
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="relative w-full h-full pointer-events-auto"
            >
              {/* Carousel Container */}
              <div className="w-full h-full">
                <ContractCarousel
                  contracts={contracts}
                  onDismiss={onClose}
                  onStatusChange={onStatusChange}
                />
              </div>

              {/* Hidden labels for accessibility */}
              <h2 id="contract-expiry-modal-title" className="sr-only">
                Contract Expiry Notification
              </h2>
              <p id="contract-expiry-modal-description" className="sr-only">
                {contracts.length === 1
                  ? `Contract "${
                      contracts[0].contractName || 'Untitled'
                    }" expires in 30 days.`
                  : `${contracts.length} contracts expire in 30 days.`}
              </p>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
