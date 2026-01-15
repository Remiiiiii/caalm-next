/**
 * Hook for license form initialization and file processing
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { licenseUploadSchema, type LicenseUploadFormData } from '../schema';
import type { ProcessedFileData } from '../types';

export function useLicenseForm() {
  const form = useForm<LicenseUploadFormData>({
    resolver: zodResolver(licenseUploadSchema) as any,
    mode: 'onSubmit',
    defaultValues: {
      licenseName: '',
      licenseNumber: '',
      licenseType: 'subscription',
      category: 'saas',
      status: 'active',
      licenseExpiryDate: undefined,
      issueDate: undefined,
      issuingAuthority: '',
      vendor: '',
      product: '',
      description: '',
      quantity: '',
      cost: '',
      currencyCode: 'USD',
      division: '',
      department: '',
      assignedManagers: [],
      autoRenew: false,
      renewalNoticeDays: '',
    },
  });

  // Synchronous file processing function
  const processFileSynchronously = useCallback(
    (file: File): Promise<ProcessedFileData> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const base64Content = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );

            const processedData: ProcessedFileData = {
              name: file.name,
              type: file.type,
              size: file.size,
              base64Content,
              arrayBuffer,
              lastModified: file.lastModified,
            };

            resolve(processedData);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsArrayBuffer(file);
      });
    },
    []
  );

  // Extract license data from file
  const extractLicenseData = useCallback(
    async (processedData: ProcessedFileData): Promise<Record<string, unknown>> => {
      try {
        const response = await fetch('/api/licenses/extract-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: processedData.name,
            fileType: processedData.type,
            fileSize: processedData.size,
            fileContent: processedData.base64Content,
          }),
        });

        if (!response.ok) {
          throw new Error('Extraction failed');
        }

        const data = await response.json();
        return data.data || {};
      } catch (error) {
        console.error('License extraction error:', error);
        return {};
      }
    },
    []
  );

  return {
    form,
    processFileSynchronously,
    extractLicenseData,
  };
}
