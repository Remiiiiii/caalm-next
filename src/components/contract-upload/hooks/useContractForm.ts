/**
 * Hook for contract form initialization and file processing
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { contractSchema, type ContractFormData } from '../schema';
import type { ProcessedFileData } from '../types';

export function useContractForm() {
  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema) as any,
    mode: 'onSubmit',
    defaultValues: {
      contractName: '',
      contractType: '',
      contractCategory: 'service_agreement',
      lifecycleStatus: 'draft',
      contractNumber: '',
      description: '',
      assignToDepartment: '',
      businessUnit: '',
      subDepartment: '',
      departmentOwner: '',
      contractOwnerId: '',
      contractOwnerName: '',
      startDate: undefined,
      executionDate: undefined,
      expiryDate: undefined,
      autoRenew: false,
      renewalNoticeDays: '',
      amount: '',
      currencyCode: 'USD',
      notToExceedAmount: '',
      paymentTerms: 'net_30',
      paymentSchedule: 'monthly',
      budgetCode: '',
      costCenter: '',
      riskLevel: 'medium',
      counterpartyLegalName: '',
      counterpartyContactName: '',
      counterpartyContactEmail: '',
      counterpartyContactPhone: '',
      counterpartyAddress: '',
      counterpartyType: 'corporation',
      counterpartyTaxId: '',
      counterpartyDunsNumber: '',
      insuranceRequired: false,
      insuranceVerifiedDate: undefined,
      insuranceExpiryDate: undefined,
      insuranceCoveragePerIncident: '',
      insuranceCoverageAggregate: '',
      indemnificationIncluded: false,
      hipaaRequired: false,
      dataPrivacyRequirements: '',
      backgroundCheckRequired: false,
      regulatoryRequirements: '',
      auditRightsGranted: false,
      versionNumber: '1.0',
      templateUsed: '',
      parentContractId: '',
      relatedDocumentIds: '',
      attachmentReferences: '',
      keyObligations: '',
      serviceLevelAgreements: '',
      performanceMetrics: '',
      reportingRequirements: '',
      postTerminationObligations: '',
      terminationNoticeDays: '30',
      terminationRights: '',
      curePeriodDays: '15',
      assignedManagers: [],
      internalApproverIds: [],
      approvalWorkflowTemplate: '',
      currentApprovalStage: '',
      reviewerComments: '',
      counterpartyContactTitle: '',
      tags: '',
      businessPurpose: '',
      projectMatterId: '',
      erpReference: '',
      crmReference: '',
      riskMitigationPlan: '',
      milestones: '',
      deliverables: '',
      slaPenalties: '',
      serviceCreditTerms: '',
      escalationProcedures: '',
      obligationOwners: '',
      approvalDueDate: undefined,
      approvalEscalationContactIds: '',
      workflowNotes: '',
      primaryInternalContactId: '',
      secondaryInternalContactId: '',
      alertRecipientIds: '',
      alertEscalationContactIds: '',
      alertLeadTimes: '30,60,90',
      alertChannels: 'email',
      alertNotes: '',
      alertStrategy: 'Standard',
      governingLaw: 'Florida',
      jurisdiction: 'Miami-Dade County, FL',
      disputeResolutionMethod: 'mediation',
      confidentialityClassification: 'internal',
      recordsRetentionPeriodMonths: '84',
      searchKeywords: '',
      digitalSignatureRequired: false,
      digitalSignatureStatus: 'not_started',
      digitalSignaturePlatform: '',
      digitalSignatureCompletedAt: undefined,
      digitalSignatureEnvelopeId: '',
      signatureRecipientIds: '',
      visibilityRoles: '',
      accessScope: 'organization',
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
            console.error('Failed to read error as text:', textError);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
        throw new Error(errorData?.error || 'Contract extraction failed');
      }

      const data = await response.json();
      console.log('Extraction successful, data received:', data);
      console.log('=== EXTRACT CONTRACT DATA END ===');
      return data.extractedData || null;
    } catch (error) {
      console.error('Contract extraction error:', error);
      console.log('=== EXTRACT CONTRACT DATA END (ERROR) ===');
      return null;
    }
  };

  return {
    form,
    processFileSynchronously,
    extractContractData,
  };
}
