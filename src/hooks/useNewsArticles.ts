import useSWR from 'swr';
import { fetcher } from '@/lib/swr-config';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  type: 'announcement' | 'update' | 'alert' | 'info';
  priority: 'high' | 'medium' | 'low';
  department?: string;
  image?: string;
  status?: 'draft' | 'published' | 'archived';
  viewCount?: number;
  scheduledAt?: string;
}

interface NewsResponse {
  items: NewsArticle[];
  total: number;
  limit: number;
  offset: number;
}

interface UseNewsArticlesOptions {
  limit?: number;
  offset?: number;
  type?: string;
  priority?: string;
  department?: string;
  status?: string;
  search?: string;
  enabled?: boolean;
}

export function useNewsArticles(options: UseNewsArticlesOptions = {}) {
  const {
    limit = 20,
    offset = 0,
    type,
    priority,
    department,
    status = 'published',
    search,
    enabled = true,
  } = options;

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    status,
  });

  if (search) params.append('search', search);
  if (type && type !== 'all') params.append('type', type);
  if (priority && priority !== 'all') params.append('priority', priority);
  if (department && department !== 'all') params.append('department', department);

  const url = enabled ? `/api/internal-news?${params.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR<NewsResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      refreshInterval: status === 'published' ? 300000 : 0, // Refresh published articles every 5 minutes
      keepPreviousData: true,
    }
  );

  return {
    articles: data?.items || [],
    total: data?.total || 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
