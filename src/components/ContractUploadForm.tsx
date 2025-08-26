'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CONTRACT_DEPARTMENTS } from '../../constants';

interface ContractUploadFormProps {
  ownerId: string;
  accountId: string;
  className?: string;
  onSuccess?: () => void;
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

const COMPLIANCE_LEVELS = [
  'Low Risk',
  'Medium Risk',
  'High Risk',
  'Critical Risk',
];

const contractSchema = z.object({
  contractName: z.string().min(1, 'Contract name is required'),
  contractType: z.string().min(1, 'Contract type is required'),
  expiryDate: z.date().refine((val) => !isNaN(val.getTime()), {
    message: 'Expiry date is required',
  }),
  amount: z
    .string()
    .min(1, 'Contract amount is required')
    .refine((val) => {
      const num = parseFloat(val.replace(/[$,]/g, ''));
      return !isNaN(num) && num >= 0;
    }, 'Please enter a valid amount'),
  department: z.string().min(1, 'Department is required'),
  description: z.string().optional(),
  priority: z.string().optional(),
  compliance: z.string().optional(),
  vendor: z.string().optional(),
  contractNumber: z.string().optional(),
});

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

  const form = useForm<z.infer<typeof contractSchema>>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractName: '',
      contractType: '',
      expiryDate: undefined,
      amount: '',
      department: '',
      description: '',
      priority: 'medium',
      compliance: '',
      vendor: '',
      contractNumber: '',
    },
  });

  // Reset function to clear all form data and file
  const resetForm = useCallback(() => {
    form.reset();
    setSelectedFile(null);
    setExtractedData(null);
    setIsExtracting(false);
    setIsUploading(false);
    setUploadProgress(0);
  }, [form]);

  // File drop handling
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        // Store the original file for upload
        setSelectedFile(file);

        // Auto-extract data from contract
        setIsExtracting(true);
        try {
          const extracted = await extractContractData(file);
          setExtractedData(extracted);

          // Pre-fill form with extracted data
          if (extracted) {
            form.reset({
              ...form.getValues(),
              contractName:
                (extracted.contractName as string) ||
                file.name.replace(/\.[^/.]+$/, ''),
              expiryDate: extracted.expiryDate
                ? new Date(extracted.expiryDate as string)
                : undefined,
              amount:
                (extracted.amount as string) ||
                (extracted.amount as number)?.toString() ||
                '',
              vendor: (extracted.vendor as string) || '',
              contractNumber: (extracted.contractNumber as string) || '',
              description: (extracted.description as string) || '',
            });
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
    [toast, form]
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

      // Clear the stream by reading it once and creating a new file
      const fileBuffer = await file.arrayBuffer();
      const freshFile = new File([fileBuffer], file.name, { type: file.type });

      const formData = new FormData();
      formData.append('file', freshFile);

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
  const handleSubmit = async (values: z.infer<typeof contractSchema>) => {
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

      // Transform amount to number for server
      const amountAsNumber = parseFloat(values.amount.replace(/[$,]/g, ''));

      // Clear the stream before upload by creating a fresh file
      const fileBuffer = await selectedFile.arrayBuffer();
      const freshFile = new File([fileBuffer], selectedFile.name, {
        type: selectedFile.type,
      });

      // Upload file with contract metadata
      await uploadFile({
        file: freshFile,
        ownerId,
        accountId,
        path: path || '/',
        contractMetadata: {
          ...values,
          amount: amountAsNumber,
          expiryDate: values.expiryDate?.toISOString(),
          extractedData,
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: 'Contract Uploaded Successfully',
        description: `${values.contractName} has been uploaded and processed.`,
      });

      // Reset form
      form.reset();
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetForm();
        }
      }}
    >
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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
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
                  <FormField
                    control={form.control}
                    name="contractName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Contract Name{' '}
                          <span className="sidebar-gradient-text">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter contract name"
                            {...field}
                            className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Contract Type{' '}
                          <span className="sidebar-gradient-text">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400">
                              <SelectValue placeholder="Select contract type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTRACT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Contract Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter contract number"
                            {...field}
                            className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Vendor/Supplier
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter vendor name"
                            {...field}
                            className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Contract Amount
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter amount (e.g., $50,000)"
                            {...field}
                            className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Department{' '}
                          <span className="sidebar-gradient-text">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTRACT_DEPARTMENTS.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Expiry Date{' '}
                          <span className="sidebar-gradient-text">*</span>
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700',
                                  !field.value && 'text-light-200'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, 'PPP')
                                  : 'Pick a date'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white border border-light-300 shadow-drop-1 rounded-xl">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Priority
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compliance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Compliance Level
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400">
                              <SelectValue placeholder="Select compliance level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COMPLIANCE_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form-label">
                        <span className="flex items-center gap-1">
                          <Image
                            src="/assets/icons/ai-icon.svg"
                            alt="info"
                            width={24}
                            height={24}
                          />
                          Description
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter contract description"
                          rows={3}
                          {...field}
                          className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 placeholder:text-slate-400 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Upload Progress */}
            {isUploading && (
              <Card className="border border-light-300 shadow-drop-1 rounded-xl bg-light-400/50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-200">
                        Uploading contract...
                      </span>
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
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
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
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractUploadForm;
