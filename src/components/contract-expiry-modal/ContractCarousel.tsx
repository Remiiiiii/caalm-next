'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SplineExpiryScene from './SplineExpiryScene';
import AnimatedContractInfo from './AnimatedContractInfo';
import ExpiryActionButtons from './ExpiryActionButtons';
import ContactDetails from './ContactDetails';
import type { UIFileDoc } from '@/types/files';

interface ContractCarouselProps {
  contracts: UIFileDoc[];
  onDismiss: () => void;
  onStatusChange?: () => void;
}

export default function ContractCarousel({
  contracts,
  onDismiss,
  onStatusChange,
}: ContractCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (contracts.length === 0) {
    return null;
  }

  const currentContract = contracts[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : contracts.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < contracts.length - 1 ? prev + 1 : 0));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Content Container with frosted glass effect */}
      <div className="relative z-[10001] flex-1 flex flex-col items-center justify-center p-8 md:p-12">
        {/* Frosted glass panel - allows Spline scene to show through blurred */}
        <div className="absolute inset-0 border-0 shadow-2xl" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="relative z-[10002] w-full max-w-5xl mx-auto -mt-6"
          >
            <div className="inline-flex flex-col items-start">
              {/* Contract Information */}
              <AnimatedContractInfo contract={currentContract} />

              {/* Contact Details */}
              <ContactDetails contract={currentContract} />

              {/* Action Buttons */}
              <ExpiryActionButtons
                contract={currentContract}
                onDismiss={onDismiss}
                onStatusChange={onStatusChange}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows - only show if multiple contracts */}
        {contracts.length > 1 && (
          <>
            <Button
              onClick={handlePrevious}
              variant="outline"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/40 text-slate-800 border-white/50 backdrop-blur-md shadow-lg z-[10003]"
              aria-label="Previous contract"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              onClick={handleNext}
              variant="outline"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/40 text-slate-800 border-white/50 backdrop-blur-md shadow-lg z-[10003]"
              aria-label="Next contract"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Dot Indicators - only show if multiple contracts */}
        {contracts.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-[10003]">
            {contracts.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all backdrop-blur-sm ${
                  index === currentIndex
                    ? 'bg-slate-700 w-8 border border-white/30'
                    : 'bg-white/50 hover:bg-white/75 border border-white/20'
                }`}
                aria-label={`Go to contract ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Close Button and Contract Counter - grouped on the right */}
        <div className="absolute top-8 right-8 flex items-center gap-3 z-[10003]">
          {contracts.length > 1 && (
            <div className="glass-card px-4 py-2">
              <span className="text-slate-800 text-sm font-medium">
                {currentIndex + 1} of {contracts.length}
              </span>
            </div>
          )}
          <Button
            onClick={onDismiss}
            variant="outline"
            size="icon"
            className="glass-card text-slate-800 shadow-lg"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Spline Scene - in front of all elements, no blur */}
      <SplineExpiryScene className="z-[10000]" />
    </div>
  );
}
