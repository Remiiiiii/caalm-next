'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { UIFileDoc } from '@/types/files';

interface AnimatedContractInfoProps {
  contract: UIFileDoc;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const, // easeOut cubic bezier
    },
  },
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const, // easeOut cubic bezier
    },
  },
};

const pulseVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const, // easeOut cubic bezier
    },
  },
};

export default function AnimatedContractInfo({
  contract,
}: AnimatedContractInfoProps) {
  const formatExpiryDate = (dateString: string | undefined): string => {
    if (!dateString) return 'No expiry date';
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const calculateDaysUntilExpiry = (): number | null => {
    if (!contract.contractExpiryDate) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryStr = contract.contractExpiryDate.split('T')[0];
      const [year, month, day] = expiryStr.split('-').map(Number);
      const expiry = new Date(year, month - 1, day);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const daysUntilExpiry = calculateDaysUntilExpiry();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative z-20 space-y-6 ml-8"
    >
      {/* Contract Name - appears first (0-200ms) */}
      <motion.div variants={scaleVariants}>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2 drop-shadow-lg">
          {contract.contractName || contract.name || 'Untitled Contract'}
        </h2>
      </motion.div>

      {/* Expiry Date - appears second (200-400ms) */}
      <motion.div variants={itemVariants}>
        <div className="text-xl md:text-2xl text-slate-700 drop-shadow-md">
          <span className="font-semibold">Expires:</span>{' '}
          {formatExpiryDate(contract.contractExpiryDate)}
        </div>
      </motion.div>

      {/* Days Until Expiry Badge - appears third (400-600ms) */}
      {daysUntilExpiry !== null && (
        <motion.div variants={pulseVariants}>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-orange backdrop-blur-sm rounded-full border-2 border-orange shadow-lg">
            <span className="text-2xl md:text-3xl font-bold text-white">
              {daysUntilExpiry}
            </span>
            <span className="text-lg md:text-xl text-white/90">
              {daysUntilExpiry === 1 ? 'day' : 'days'} until expiry
            </span>
          </div>
        </motion.div>
      )}

      {/* Contract Details - appears with stagger (600-1000ms) */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 gap-4 mt-8 w-[930px]"
      >
        {contract.status && (
          <motion.div variants={itemVariants} className="glass-card p-4">
            <div className="text-sm text-slate-600 mb-1">Status</div>
            <div className="text-lg font-semibold text-slate-800">
              {contract.status.charAt(0).toUpperCase() +
                contract.status.slice(1).replace(/-/g, ' ')}
            </div>
          </motion.div>
        )}

        {contract.amount !== undefined && contract.amount !== null && (
          <motion.div variants={itemVariants} className="glass-card p-4">
            <div className="text-sm text-slate-600 mb-1">Amount</div>
            <div className="text-lg font-semibold text-slate-800">
              ${contract.amount.toLocaleString()}
            </div>
          </motion.div>
        )}

        {contract.contractType && (
          <motion.div variants={itemVariants} className="glass-card p-4">
            <div className="text-sm text-slate-600 mb-1">Contract Type</div>
            <div className="text-lg font-semibold text-slate-800">
              {contract.contractType}
            </div>
          </motion.div>
        )}

        {contract.vendor && (
          <motion.div variants={itemVariants} className="glass-card p-4">
            <div className="text-sm text-slate-600 mb-1">Vendor</div>
            <div className="text-lg font-semibold text-slate-800">
              {contract.vendor}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
