'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, X, Eye, Mail, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateContractStatus } from '@/hooks/useUpdateContractStatus';
import type { UIFileDoc } from '@/types/files';

interface ExpiryActionButtonsProps {
  contract: UIFileDoc;
  onDismiss: () => void;
  onStatusChange?: () => void;
}

export default function ExpiryActionButtons({
  contract,
  onDismiss,
  onStatusChange,
}: ExpiryActionButtonsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { updateStatus } = useUpdateContractStatus({ onStatusChange });
  const [showLetExpireDialog, setShowLetExpireDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRenewContract = () => {
    // Navigate to contract details page or renewal form
    // For now, navigate to contracts page - can be enhanced later with specific renewal route
    router.push(`/contracts`);
    onDismiss();
  };

  const handleLetExpire = async () => {
    setIsUpdating(true);
    try {
      const success = await updateStatus({
        fileId: contract.$id,
        status: 'inactive',
        path: '/dashboard',
      });
      if (success) {
        setShowLetExpireDialog(false);
        onDismiss();
      }
    } catch (error) {
      console.error('Failed to update contract status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewDetails = () => {
    // Navigate to contract details - check if there's a specific contract details route
    // For now, navigate to contracts page
    router.push(`/contracts`);
    onDismiss();
  };

  const handleContactProvider = () => {
    // Access counterparty email if available
    const counterparty = contract as UIFileDoc & {
      counterpartyContactEmail?: string;
      counterpartyContactPhone?: string;
    };

    if (counterparty.counterpartyContactEmail) {
      window.location.href = `mailto:${counterparty.counterpartyContactEmail}`;
    } else if (counterparty.counterpartyContactPhone) {
      window.location.href = `tel:${counterparty.counterpartyContactPhone}`;
    } else {
      toast({
        title: 'Contact information not available',
        description: 'No contact email or phone number found for this vendor.',
        variant: 'destructive',
      });
    }
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="relative z-20 mt-8 flex flex-nowrap gap-3 w-fit ml-8"
      >
        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={handleRenewContract}
            className="bg-blue hover:bg-blue text-white shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Renew Contract
          </Button>
        </motion.div>

        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={() => setShowLetExpireDialog(true)}
            variant="outline"
            className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            <X className="w-4 h-4 mr-2" />
            Let Expire
          </Button>
        </motion.div>

        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={handleViewDetails}
            variant="outline"
            className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </motion.div>

        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={handleContactProvider}
            variant="outline"
            className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            <Mail className="w-4 h-4 mr-2" />
            Contact Provider
          </Button>
        </motion.div>

        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={onDismiss}
            variant="outline"
            className="glass-card text-slate-800 shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            Dismiss
          </Button>
        </motion.div>
      </motion.div>

      {/* Confirmation Dialog for Let Expire */}
      <AlertDialog
        open={showLetExpireDialog}
        onOpenChange={setShowLetExpireDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Let Contract Expire?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this contract as inactive and let it
              expire? This action will update the contract status to
              &quot;inactive&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLetExpire}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Let Expire'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
