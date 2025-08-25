'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  CalendarIcon,
  Upload,
  FileText,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/lib/actions/file.actions';
import { usePathname } from 'next/navigation';

interface ContractUploadFormProps {
  ownerId: string;
  accountId: string;
  className?: string;
  onSuccess?: () => void;
}

interface ContractFormData {
  contractName: string;
  contractType: string;
  expiryDate: Date | undefined;
  amount: string;
  department: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedManagers: string[];
  compliance: string;
  vendor: string;
  contractNumber: string;
}

const CONTRACT_TYPES = [
  'Service Agreement',
  'Purchase Order',
  'License Agreement',
  'NDA',
  'Employment Contract',
  'Vendor Contract',
  'Lease Agreement',
  'Consulting Agreement',
  'Other',
];

const DEPARTMENTS = [
  'IT',
  'Finance',
  'HR',
  'Legal',
  'Operations',
  'Sales',
  'Marketing',
  'Engineering',
  'Other',
];

const COMPLIANCE_LEVELS = [
  'Low Risk',
  'Medium Risk',
  'High Risk',
  'Critical Risk',
];

const ContractUploadForm: React.FC<ContractUploadFormProps> = ({
  ownerId,
  accountId,
  className,
  onSuccess,
}) => {
  const path = usePathname();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const [formData, setFormData] = useState<ContractFormData>({
    contractName: '',
    contractType: '',
    expiryDate: undefined,
    amount: '',
    department: '',
    description: '',
    priority: 'medium',
    assignedManagers: [],
    compliance: '',
    vendor: '',
    contractNumber: '',
  });

  // File drop handling
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);

        // Auto-extract data from contract
        setIsExtracting(true);
        try {
          const extracted = await extractContractData(file);
          setExtractedData(extracted);

          // Pre-fill form with extracted data
          if (extracted) {
            setFormData((prev) => ({
              ...prev,
              contractName:
                (extracted.contractName as string) ||
                file.name.replace(/\.[^/.]+$/, ''),
              expiryDate: extracted.expiryDate
                ? new Date(extracted.expiryDate as string)
                : undefined,
              amount: (extracted.amount as string) || '',
              vendor: (extracted.vendor as string) || '',
              contractNumber: (extracted.contractNumber as string) || '',
            }));
          }
        } catch (error) {
          console.error('Failed to extract contract data:', error);
          // Don't show error toast for extraction failures - just continue with manual input
          // toast({
          //   title: 'Extraction Failed',
          //   description:
          //     'Could not automatically extract contract data. Please fill manually.',
          //   variant: 'destructive',
          // });
        } finally {
          setIsExtracting(false);
        }
      }
    },
    [toast]
  );

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
  });

  // Extract contract data using AI/OCR
  const extractContractData = async (
    file: File
  ): Promise<Record<string, unknown> | null> => {
    try {
      console.log('Starting contract data extraction for file:', file.name);

      const formData = new FormData();
      formData.append('file', file);

      console.log('Making request to /api/contracts/extract-data');
      const response = await fetch('/api/contracts/extract-data', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log(
        'Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, get the text content
          const textContent = await response.text();
          console.error('Response text content:', textContent);
          console.error('JSON parsing error:', jsonError);
          throw new Error(
            `HTTP ${response.status}: ${textContent.substring(0, 200)}`
          );
        }
        console.error('Extraction failed:', errorData);
        throw new Error(
          errorData.error || `HTTP ${response.status}: Extraction failed`
        );
      }

      const result = await response.json();
      console.log('Extraction result:', result);

      // Check if the response has the expected structure
      if (result.success && result.data) {
        return result.data;
      } else {
        console.error('Unexpected response structure:', result);
        return null;
      }
    } catch (error) {
      console.error('Contract data extraction error:', error);
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a contract file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file with contract metadata
      await uploadFile({
        file: selectedFile,
        ownerId,
        accountId,
        path: path || '/',
        contractMetadata: {
          ...formData,
          expiryDate: formData.expiryDate?.toISOString(),
          extractedData,
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: 'Contract Uploaded Successfully',
        description: `${formData.contractName} has been uploaded and processed.`,
      });

      // Reset form
      setFormData({
        contractName: '',
        contractType: '',
        expiryDate: undefined,
        amount: '',
        department: '',
        description: '',
        priority: 'medium',
        assignedManagers: [],
        compliance: '',
        vendor: '',
        contractNumber: '',
      });
      setSelectedFile(null);
      setExtractedData(null);
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload contract. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            'primary-btn h-10 px-4 shadow-drop-1 text-sm',
            className
          )}
        >
          <FileText className="h-4 w-4 mr-2" />
          Upload Contract
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-[26px] border border-light-300 shadow-drop-1">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-xl font-bold sidebar-gradient-text">
            Upload Contract
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
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
                    : 'border-light-200 hover:border-brand/50 hover:bg-light-400'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-light-200 mb-4" />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="h-5 w-5 text-green" />
                      <span className="font-medium text-dark-200">
                        {selectedFile.name}
                      </span>
                    </div>
                    <p className="text-sm text-light-200">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
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

          {/* Contract Details Section */}
          <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-light-400/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold sidebar-gradient-text">
                  2. Contract Details
                </CardTitle>
                {extractedData && (
                  <Badge className="bg-green/10 text-green border-green/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Data extracted automatically
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="">
                  <Label htmlFor="contractName" className="shad-form-label">
                    Contract Name *
                  </Label>
                  <Input
                    id="contractName"
                    value={formData.contractName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contractName: e.target.value,
                      }))
                    }
                    placeholder="Enter contract name"
                    required
                    className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div className="">
                  <Label htmlFor="contractType" className="shad-form-label">
                    Contract Type *
                  </Label>
                  <Select
                    value={formData.contractType}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, contractType: value }))
                    }
                  >
                    <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400">
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="">
                  <Label htmlFor="contractNumber" className="shad-form-label">
                    Contract Number
                  </Label>
                  <Input
                    id="contractNumber"
                    value={formData.contractNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contractNumber: e.target.value,
                      }))
                    }
                    placeholder="Enter contract number"
                    className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div className="">
                  <Label htmlFor="vendor" className="shad-form-label">
                    Vendor/Supplier
                  </Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vendor: e.target.value,
                      }))
                    }
                    placeholder="Enter vendor name"
                    className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div className="">
                  <Label htmlFor="amount" className="shad-form-label">
                    Contract Amount
                  </Label>
                  <Input
                    id="amount"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="Enter amount (e.g., $50,000)"
                    className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div className="">
                  <Label htmlFor="department" className="shad-form-label">
                    Department *
                  </Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, department: value }))
                    }
                  >
                    <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="">
                  <Label htmlFor="expiryDate" className="shad-form-label">
                    Expiry Date *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700',
                          !formData.expiryDate && 'text-light-200'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expiryDate
                          ? format(formData.expiryDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-light-300 shadow-drop-1 rounded-xl">
                      <Calendar
                        mode="single"
                        selected={formData.expiryDate}
                        onSelect={(date) =>
                          setFormData((prev) => ({ ...prev, expiryDate: date }))
                        }
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="">
                  <Label htmlFor="priority" className="shad-form-label">
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(
                      value: 'low' | 'medium' | 'high' | 'urgent'
                    ) => setFormData((prev) => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="">
                  <Label htmlFor="compliance" className="shad-form-label">
                    Compliance Level
                  </Label>
                  <Select
                    value={formData.compliance}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, compliance: value }))
                    }
                  >
                    <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400">
                      <SelectValue placeholder="Select compliance level" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLIANCE_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="">
                <Label htmlFor="description" className="shad-form-label">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter contract description"
                  rows={3}
                  className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {isUploading && (
            <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-light-400/50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-200">Uploading contract...</span>
                    <span className="text-brand font-medium">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-light-300 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-brand to-brand-100 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
              className="primary-btn shimmer-hover"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="primary-btn min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Contract'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractUploadForm;
