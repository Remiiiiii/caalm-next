import { useToast } from '@/hooks/use-toast';
import { contractStatus } from '@/lib/actions/file.actions';

export function useUpdateContractStatus({
  onStatusChange,
}: {
  onStatusChange?: () => void;
}) {
  const { toast } = useToast();

  const updateStatus = async ({
    fileId,
    status,
    path,
  }: {
    fileId: string;
    status: string;
    path: string;
  }) => {
    try {
      await contractStatus({ fileId, status, path });
      toast({
        title: 'Status Updated',
        description: `Contract status changed to "${status}"`,
      });
      if (onStatusChange) onStatusChange();
      return true;
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update contract status.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { updateStatus };
}
