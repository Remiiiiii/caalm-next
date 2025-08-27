'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import {
  getAllManagers,
  getUsersByDepartment,
} from '@/lib/actions/database.actions';

interface ContractUploadFormProps {
  ownerId: string;
  accountId: string;
  className?: string;
  onSuccess?: () => void;
}

// Processed file data interface
interface ProcessedFileData {
  name: string;
  type: string;
  size: number;
  base64Content: string;
  arrayBuffer: ArrayBuffer;
  lastModified: number;
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
  assignedManagers: z.array(z.string()).optional(),
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
  const [processedFileData, setProcessedFileData] =
    useState<ProcessedFileData | null>(null);
  const [extractedData, setExtractedData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [availableManagers, setAvailableManagers] = useState<
    Array<{ $id: string; fullName: string; email: string; division?: string }>
  >([]);
  const [filteredManagers, setFilteredManagers] = useState<
    Array<{ $id: string; fullName: string; email: string; division?: string }>
  >([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);

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
      assignedManagers: [],
    },
  });

  // Fetch managers on component mount
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const managers = await getAllManagers();
        if (managers) {
          const typedManagers = managers.map(
            (manager: {
              $id: string;
              fullName?: string;
              email?: string;
              division?: string;
            }) => ({
              $id: manager.$id,
              fullName: manager.fullName || 'Unknown',
              email: manager.email || '',
              division: manager.division,
            })
          );
          setAvailableManagers(typedManagers);
          setFilteredManagers(typedManagers);
        }
      } catch (error) {
        console.error('Failed to fetch managers:', error);
      }
    };
    fetchManagers();
  }, []);

  // Filter managers when department changes
  useEffect(() => {
    const department = form.watch('department');
    if (department) {
      // Fetch managers for the selected department
      const fetchDepartmentManagers = async () => {
        try {
          const departmentManagers = await getUsersByDepartment(department);
          if (departmentManagers) {
            const typedManagers = departmentManagers.map(
              (manager: {
                $id: string;
                fullName?: string;
                email?: string;
                division?: string;
              }) => ({
                $id: manager.$id,
                fullName: manager.fullName || 'Unknown',
                email: manager.email || '',
                division: manager.division,
              })
            );
            setFilteredManagers(typedManagers);
          }
        } catch (error) {
          console.error('Failed to fetch department managers:', error);
          // Fallback to all managers if department filtering fails
          setFilteredManagers(availableManagers);
        }
      };
      fetchDepartmentManagers();
    } else {
      setFilteredManagers(availableManagers);
    }
  }, [form.watch('department'), availableManagers]);

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

  // Reset function to clear all form data and file
  const resetForm = useCallback(() => {
    form.reset();
    setProcessedFileData(null);
    setExtractedData(null);
    setIsExtracting(false);
    setSelectedManagers([]);
    setIsUploading(false);
    setUploadProgress(0);
  }, [form]);

  // File drop handling with synchronous processing
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        try {
          // Process file synchronously and cache all data
          const processedData = await processFileSynchronously(file);
          setProcessedFileData(processedData);

          // Auto-extract data from contract using cached data
          setIsExtracting(true);
          try {
            const extracted = await extractContractData(processedData);
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
            // Continue with manual input if extraction fails
          } finally {
            setIsExtracting(false);
          }
        } catch (error) {
          console.error('File processing failed:', error);
          toast({
            title: 'File Processing Failed',
            description:
              'Failed to process the selected file. Please try again.',
            variant: 'destructive',
          });
        }
      }
    },
    [form, processFileSynchronously, toast]
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

  // Extract contract data using base64 approach
  const extractContractData = async (
    fileData: ProcessedFileData
  ): Promise<Record<string, unknown> | null> => {
    try {
      console.log('=== EXTRACT CONTRACT DATA START ===');
      console.log('Starting contract data extraction for file:', fileData.name);
      console.log('File type:', fileData.type);
      console.log('File size:', fileData.size);
      console.log('Base64 content length:', fileData.base64Content.length);

      // Send file data as base64 in JSON payload instead of FormData
      const requestBody = {
        fileName: fileData.name,
        fileType: fileData.type,
        fileSize: fileData.size,
        fileContent: fileData.base64Content,
      };

      console.log('Request body prepared, making API call...');
      console.log('Making request to /api/contracts/extract-data');

      const response = await fetch('/api/contracts/extract-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response received, status:', response.status);
      console.log(
        'Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        console.error('Response not OK, attempting to read error...');

        // Clone the response to avoid stream consumption issues
        const responseClone = response.clone();

        let errorData;
        try {
          errorData = await responseClone.json();
          console.error('Error data (JSON):', errorData);
        } catch {
          console.error('Failed to parse error as JSON, trying text...');
          try {
            const textContent = await response.text();
            console.error('Response text content:', textContent);
            throw new Error(
              `HTTP ${response.status}: ${textContent.substring(0, 200)}`
            );
          } catch (textError) {
            console.error('Failed to read response text:', textError);
            throw new Error(
              `HTTP ${response.status}: Unable to read error response`
            );
          }
        }
        console.error('Extraction failed:', errorData);
        throw new Error(
          errorData.error || `HTTP ${response.status}: Extraction failed`
        );
      }

      console.log('Response OK, parsing JSON...');
      const result = await response.json();
      console.log('Extraction result:', result);

      if (result.success && result.data) {
        console.log('=== EXTRACT CONTRACT DATA SUCCESS ===');
        return result.data;
      } else {
        console.error('Unexpected response structure:', result);
        console.log(
          '=== EXTRACT CONTRACT DATA FAILED - UNEXPECTED STRUCTURE ==='
        );
        return null;
      }
    } catch (error) {
      console.error('=== EXTRACT CONTRACT DATA ERROR ===');
      console.error('Contract data extraction error:', error);
      console.error(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack trace'
      );
      return null;
    }
  };

  // Handle form submission using cached file data
  const handleSubmit = async (values: z.infer<typeof contractSchema>) => {
    if (!processedFileData) {
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

      // Create File object from cached data for upload
      const fileForUpload = new File(
        [processedFileData.arrayBuffer],
        processedFileData.name,
        {
          type: processedFileData.type,
          lastModified: processedFileData.lastModified,
        }
      );

      // Upload file with contract metadata
      await uploadFile({
        file: fileForUpload,
        ownerId,
        accountId,
        path: path || '/',
        contractMetadata: {
          ...values,
          amount: amountAsNumber,
          expiryDate: values.expiryDate?.toISOString(),
          assignedManagers: selectedManagers,
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
      setProcessedFileData(null);
      setExtractedData(null);
      setSelectedManagers([]);
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
          <FileText className="h-4 w-4" />
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

                  {processedFileData ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <FileText className="h-5 w-5 text-green" />
                        <span className="font-medium text-dark-200">
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
                    name="assignedManagers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form-label">
                          Assign To
                        </FormLabel>
                        <div className="space-y-2">
                          <div className="max-h-40 overflow-y-auto border border-white/40 rounded-md bg-white/30 backdrop-blur p-2">
                            {filteredManagers.length > 0 ? (
                              filteredManagers.map((manager) => (
                                <div
                                  key={manager.$id}
                                  className="flex items-center space-x-2 p-2 hover:bg-white/20 rounded cursor-pointer"
                                  onClick={() => {
                                    const newSelection =
                                      selectedManagers.includes(manager.$id)
                                        ? selectedManagers.filter(
                                            (id) => id !== manager.$id
                                          )
                                        : [...selectedManagers, manager.$id];
                                    setSelectedManagers(newSelection);
                                    field.onChange(newSelection);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedManagers.includes(
                                      manager.$id
                                    )}
                                    onChange={() => {
                                      const newSelection =
                                        selectedManagers.includes(manager.$id)
                                          ? selectedManagers.filter(
                                              (id) => id !== manager.$id
                                            )
                                          : [...selectedManagers, manager.$id];
                                      setSelectedManagers(newSelection);
                                      field.onChange(newSelection);
                                    }}
                                    className="cursor-pointer"
                                  />
                                  <span className="text-sm text-slate-700">
                                    {manager.fullName} ({manager.email})
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500 p-2">
                                No managers available
                              </p>
                            )}
                          </div>
                          {selectedManagers.length > 0 && (
                            <div className="text-xs text-slate-600">
                              Selected: {selectedManagers.length} manager(s)
                            </div>
                          )}
                        </div>
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
                disabled={isUploading || !processedFileData}
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
