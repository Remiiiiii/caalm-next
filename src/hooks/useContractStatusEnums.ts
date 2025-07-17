import { useEffect, useState } from 'react';
import { getContractStatusEnums } from '@/lib/actions/file.actions';

export function useContractStatusEnums() {
  const [enums, setEnums] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getContractStatusEnums()
      .then((res) => setEnums(res || []))
      .catch(() => setError('Failed to load status options'))
      .finally(() => setLoading(false));
  }, []);

  return { enums, loading, error };
}
