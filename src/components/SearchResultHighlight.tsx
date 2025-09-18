'use client';

import React from 'react';

interface SearchResultHighlightProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

const SearchResultHighlight: React.FC<SearchResultHighlightProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-yellow-200 font-semibold',
}) => {
  if (!query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const queryWords = query.trim().split(/\s+/);
  const regex = new RegExp(
    `(${queryWords
      .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})`,
    'gi'
  );

  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = queryWords.some((word) =>
          part.toLowerCase().includes(word.toLowerCase())
        );

        return isMatch ? (
          <mark key={index} className={highlightClassName}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
};

export default SearchResultHighlight;
