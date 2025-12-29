/**
 * Zod schema for Contract Upload Form validation
 */

import * as z from 'zod';

export const contractSchema = z.object({
  contractName: z
    .string()
    .min(1, 'Contract title is required')
    .max(200, 'Keep the title under 200 characters'),
  contractType: z.string().min(1, 'Contract type is required'),
  contractCategory: z.string().optional(), // Category field removed from UI, made optional
  lifecycleStatus: z.string().min(1, 'Lifecycle status is required'),
  contractNumber: z.string().min(1, 'Contract number is required'),
  description: z.string().optional(),
  assignToDepartment: z
    .string()
    .min(1, 'Business unit / department is required'),
  businessUnit: z.string().optional(),
  subDepartment: z.string().optional(),
  departmentOwner: z.string().optional(),
  contractOwnerId: z.string().min(1, 'Owner is required'),
  startDate: z.date().optional(),
  executionDate: z.date().optional(),
  expiryDate: z
    .date({ message: 'Expiry date is required' })
    .refine((val) => !isNaN(val.getTime()), {
      message: 'Expiry date is required',
    }),
  autoRenew: z.boolean().default(false),
  renewalNoticeDays: z.string().optional(),
  amount: z
    .string()
    .min(1, 'Contract amount is required')
    .refine((val) => {
      const num = parseFloat(val.replace(/[$,]/g, ''));
      return !isNaN(num) && num >= 0;
    }, 'Please enter a valid amount'),
  currencyCode: z.string().min(1, 'Currency is required'),
  notToExceedAmount: z.string().optional(),
  paymentTerms: z.string().optional(),
  paymentSchedule: z.string().optional(),
  budgetCode: z.string().optional(),
  costCenter: z.string().optional(),
  riskLevel: z.string().min(1, 'Risk level is required'),
  counterpartyLegalName: z
    .string()
    .min(1, 'Counterparty legal entity name is required'),
  counterpartyContactName: z.string().optional(),
  counterpartyContactTitle: z.string().optional(),
  counterpartyContactEmail: z
    .string()
    .email('Provide a valid email address')
    .optional()
    .or(z.literal('')),
  counterpartyContactPhone: z.string().optional(),
  counterpartyAddress: z.string().optional(),
  counterpartyType: z.string().optional(),
  counterpartyTaxId: z.string().optional(),
  counterpartyDunsNumber: z.string().optional(),
  insuranceRequired: z.boolean().default(false),
  insuranceVerifiedDate: z.date().optional(),
  insuranceExpiryDate: z.date().optional(),
  insuranceCoveragePerIncident: z.string().optional(),
  insuranceCoverageAggregate: z.string().optional(),
  indemnificationIncluded: z.boolean().default(false),
  hipaaRequired: z.boolean().default(false),
  dataPrivacyRequirements: z.string().optional(),
  backgroundCheckRequired: z.boolean().default(false),
  regulatoryRequirements: z.string().optional(),
  auditRightsGranted: z.boolean().default(false),
  versionNumber: z.string().optional(),
  templateUsed: z.string().optional(),
  parentContractId: z.string().optional(),
  relatedDocumentIds: z.string().optional(),
  attachmentReferences: z.string().optional(),
  tags: z.string().optional(),
  businessPurpose: z.string().optional(),
  projectMatterId: z.string().optional(),
  erpReference: z.string().optional(),
  crmReference: z.string().optional(),
  keyObligations: z.string().optional(),
  serviceLevelAgreements: z.string().optional(),
  performanceMetrics: z.string().optional(),
  reportingRequirements: z.string().optional(),
  postTerminationObligations: z.string().optional(),
  terminationNoticeDays: z.string().optional(),
  terminationRights: z.string().optional(),
  curePeriodDays: z.string().optional(),
  riskMitigationPlan: z.string().optional(),
  milestones: z.string().optional(),
  deliverables: z.string().optional(),
  slaPenalties: z.string().optional(),
  serviceCreditTerms: z.string().optional(),
  escalationProcedures: z.string().optional(),
  obligationOwners: z.string().optional(),
  assignedManagers: z.array(z.string()).optional(),
  internalApproverIds: z.array(z.string()).optional(),
  approvalWorkflowTemplate: z.string().optional(),
  currentApprovalStage: z.string().optional(),
  reviewerComments: z.string().optional(),
  approvalDueDate: z.date().optional(),
  approvalEscalationContactIds: z.string().optional(),
  workflowNotes: z.string().optional(),
  primaryInternalContactId: z.string().optional(),
  secondaryInternalContactId: z.string().optional(),
  alertRecipientIds: z.string().optional(),
  alertEscalationContactIds: z.string().optional(),
  alertLeadTimes: z.string().optional(),
  alertChannels: z.string().optional(),
  alertNotes: z.string().optional(),
  alertStrategy: z.string().optional(),
  governingLaw: z.string().optional(),
  jurisdiction: z.string().optional(),
  disputeResolutionMethod: z.string().optional(),
  confidentialityClassification: z.string().optional(),
  recordsRetentionPeriodMonths: z.string().optional(),
  searchKeywords: z.string().optional(),
  digitalSignatureRequired: z.boolean().default(false),
  digitalSignatureStatus: z.string().optional(),
  digitalSignaturePlatform: z.string().optional(),
  digitalSignatureCompletedAt: z.date().optional(),
  digitalSignatureEnvelopeId: z.string().optional(),
  signatureRecipientIds: z.string().optional(),
  visibilityRoles: z.string().optional(),
  accessScope: z.string().optional(),
});

export type ContractFormData = z.infer<typeof contractSchema>;


