'use client';

import { useRouter } from 'next/navigation';
import ContractsView from './ContractsView';
import type { UIFileDoc } from '@/types/files';

interface ContractsViewClientProps {
  files: UIFileDoc[];
  user: {
    role?: string;
  } | null;
}

export default function ContractsViewClient({
  files,
  user,
}: ContractsViewClientProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return <ContractsView files={files} user={user} onRefresh={handleRefresh} />;
}
