import React from 'react';
import Sort from '@/components/Sort';
import { getFiles, getTotalSpaceUsed } from '@/lib/actions/file.actions';
import { getCurrentUser } from '@/lib/actions/user.actions';
import Card from '@/components/Card';
import { getFileTypesParams } from '@/lib/utils';
import FileUsageOverview from '@/components/FileUsageOverview';
import { UIFileDoc } from '@/types/files';

const Page = async ({ searchParams, params }: SearchParamProps) => {
  const type = ((await params)?.type as string) || '';
  const searchText = ((await searchParams)?.query as string) || '';
  const sort = ((await searchParams)?.sort as string) || '';

  const types = getFileTypesParams(type) as FileType[];

  const files = await getFiles({ types, searchText, sort });

  // Fetch total space data for File Usage Overview
  const totalSpace = await getTotalSpaceUsed();

  // Get current user
  const user = await getCurrentUser();

  // If type is 'images', filter to only png, jpg, jpeg
  let filteredDocuments = files.documents as UIFileDoc[];
  if (type.toLowerCase() === 'images') {
    filteredDocuments = files.documents.filter((file: UIFileDoc) => {
      const ext = (file.extension || '').toLowerCase();
      return ext === 'png' || ext === 'jpg' || ext === 'jpeg';
    });
  }

  // Calculate total size in bytes
  const totalSizeBytes = filteredDocuments.reduce(
    (sum: number, file: UIFileDoc) => sum + (file.size || 0),
    0
  );
  // Format total size using convertFileSize
  const { convertFileSize } = await import('@/lib/utils');
  const totalSizeFormatted = convertFileSize(totalSizeBytes);

  return (
    <div className="page-container">
      <h1 className="h1 capitalize mr-auto">{type}</h1>
      {/* File Usage Overview Section - Only show on uploads page */}
      {(!type || type.toLowerCase() === 'uploads') && (
        <section className="mb-8 w-full">
          <FileUsageOverview totalSpace={totalSpace} user={user} />
        </section>
      )}
      <section className="w-full">
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
          {filteredDocuments.map((file: UIFileDoc) => (
            <Card
              key={file.$id}
              file={file}
              status={file.status}
              expirationDate={file.contractExpiryDate}
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
