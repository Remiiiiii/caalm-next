/**
 * Step 1: File Upload and Saved Drafts
 */

'use client';

import React from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Loader2,
  FileCheck,
  StepForward,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProcessedFileData, Draft } from '../types';
import { STEP_TITLES } from '../constants';

interface Step1Props {
  processedFileData: ProcessedFileData | null;
  isExtracting: boolean;
  savedDrafts: Draft[];
  onDrop: (files: File[]) => void;
  onResumeDraft: (draft: Draft) => void;
  onDeleteDraft: (draftId: string) => void;
}

export default function Step1FileUpload({
  processedFileData,
  isExtracting,
  savedDrafts,
  onDrop,
  onResumeDraft,
  onDeleteDraft,
}: Step1Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  } as DropzoneOptions);

  return (
    <>
      {/* File Upload Card */}
      <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-light-400/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold sidebar-gradient-text">
            1. Upload Contract File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
              isDragActive
                ? 'border-brand bg-brand/5'
                : 'border-light-200 hover:border-[#03B1C1] hover:bg-light-400'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-light-200 mb-4" />

            {processedFileData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-5 w-5 text-green" />
                  <span className="font-medium text-navy">
                    {processedFileData.name}
                  </span>
                </div>
                <p className="text-sm text-light-200">
                  {(processedFileData.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-navy">
                  {isDragActive
                    ? 'Drop the contract here'
                    : 'Drag & drop contract file here'}
                </p>
                <p className="text-sm text-light-200 mt-2">
                  Supports PDF, DOC, DOCX, TXT (Max 50MB)
                </p>
              </div>
            )}

            {isExtracting && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                <span className="text-sm text-light-200">
                  Extracting contract data...
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Drafts List */}
      {savedDrafts.length > 0 && (
        <Card className="border border-slate-200 shadow-sm rounded-lg bg-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-green" />
              Saved Progress ({savedDrafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedDrafts.map((draft) => {
                const formData =
                  typeof draft.formData === 'string'
                    ? JSON.parse(draft.formData)
                    : draft.formData;

                return (
                  <div
                    key={draft.$id}
                    className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {formData?.contractName || 'Untitled Contract'}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-green/10 text-green border-green/20"
                        >
                          {draft.progressPercentage}% Complete
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>
                          Step {draft.currentStep}:{' '}
                          {STEP_TITLES[draft.currentStep - 1]}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(draft.lastSavedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onResumeDraft(draft)}
                        className="h-8 text-xs primary-btn sm:px-4 px-3 shimmer-hover"
                      >
                        <StepForward className="h-4 w-4" />
                        Continue
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteDraft(draft.$id)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
