import React from 'react';
import Sort from '@/components/Sort';
import { getFiles } from '@/lib/actions/file.actions';
import { Models } from 'node-appwrite';
import Card from '@/components/Card';
import { getFileTypesParams } from '@/lib/utils';

const Page = async ({ searchParams, params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || '';
  const searchText = ((await searchParams)?.query as string) || '';
  const sort = ((await searchParams)?.sort as string) || '';

  const types = getFileTypesParams(type) as FileType[];

  const files = await getFiles({ types, searchText, sort });

  // If type is 'images', filter to only png, jpg, jpeg
  let filteredDocuments = files.documents;
  if (type.toLowerCase() === 'images') {
    filteredDocuments = files.documents.filter((file: Models.Document) => {
      const ext = (file.extension || '').toLowerCase();
      return ext === 'png' || ext === 'jpg' || ext === 'jpeg';
    });
  }

  // Calculate total size in bytes
  const totalSizeBytes = filteredDocuments.reduce(
    (sum: number, file: Models.Document) => sum + (file.size || 0),
    0
  );
  // Format total size using convertFileSize
  const { convertFileSize } = await import('@/lib/utils');
  const totalSizeFormatted = convertFileSize(totalSizeBytes);

  return (
    <div className="page-container">
      <section className="w-full">
        <h1 className="h1 capitalize">{type}</h1>

        <div className="total-size-section">
          <p className="body-1">
            Total: <span className="h5">{totalSizeFormatted}</span>
          </p>

          <div className="sort-container">
            <p className="body-1 hidden text-light-200 sm:block">Sort by:</p>

            <Sort />
          </div>
        </div>
      </section>

      {/* Render the files */}
      {filteredDocuments.length > 0 ? (
        <section className="file-list">
          {filteredDocuments.map((file: Models.Document) => (
            <Card
              key={file.$id}
              file={file}
              status={file.status}
              expirationDate={file.expirationDate}
            />
          ))}
        </section>
      ) : (
        <p className="empty-list">No files uploaded yet</p>
      )}
    </div>
  );
};

export default Page;
