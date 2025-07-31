'use client';

import React from 'react';
import Image from 'next/image';
import { Input } from './ui/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Thumbnail from './Thumbnail';
import FormattedDateTime from './FormattedDateTime';
import { useSearch } from '@/hooks/useSearch';

const Search = () => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get('query') || '';
  const router = useRouter();
  const path = usePathname();

  // Use SWR hook for search functionality
  const {
    query,
    setQuery,
    searchResults: results,
    isLoading,
    error,
    performSearch,
    saveSearch,
  } = useSearch();

  // Handle search query changes
  React.useEffect(() => {
    if (query.length === 0) {
      return router.push(
        (path ?? '').replace(
          (searchParams && searchParams.toString()) || '',
          ''
        )
      );
    }
  }, [query, path, router, searchParams]);

  React.useEffect(() => {
    if (!searchQuery) {
      setQuery('');
    }
  }, [searchQuery, setQuery]);

  // Show results when we have them
  const open = results.length > 0 || (query.length > 0 && !isLoading);

  const handleClickItem = (file: any) => {
    // Save the search query
    saveSearch(query);

    router.push(
      `/${
        file.type === 'video' || file.type === 'audio'
          ? 'media'
          : file.type + 's'
      }?query=${query}`
    );
  };

  return (
    <div className="search">
      <div className="search-input-wrapper">
        <Image
          src="/assets/icons/search.svg"
          alt="search"
          width={24}
          height={24}
        />
        <Input
          value={query}
          placeholder="Search..."
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />

        {open && (
          <ul className="search-result">
            {results.length > 0 ? (
              results.map((file) => (
                <li
                  className="flex items-center justify-between"
                  key={file.$id}
                  onClick={() => handleClickItem(file)}
                >
                  <div className="flex cursor-pointer items-center gap-4">
                    <Thumbnail
                      type={file.type}
                      extension={file.extension}
                      url={file.url}
                      className="size-9 min-w-9"
                    />
                    <p className="subtitle-2 line-clamp-1 text-light-100">
                      {file.name}
                    </p>
                  </div>

                  <FormattedDateTime
                    date={file.$createdAt}
                    className="caption line-clamp-1 text-light-200"
                  />
                </li>
              ))
            ) : (
              <p className="empty-result">No files found</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Search;
