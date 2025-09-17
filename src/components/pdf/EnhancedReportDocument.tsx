import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// Professional styling based on analyzed PDF reports
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 50,
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.5,
  },

  // Cover Page Styles (inspired by Government Report format)
  coverPage: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    textAlign: 'center',
  },

  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 40,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },

  subtitle: {
    fontSize: 18,
    color: '#475569',
    marginBottom: 60,
    textAlign: 'center',
  },

  // Header Styles (inspired by Academic Report format)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
  },

  headerLeft: {
    flexDirection: 'column',
    flex: 1,
  },

  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 3,
  },

  companyTagline: {
    fontSize: 10,
    color: '#64748b',
    fontStyle: 'italic',
  },

  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flex: 1,
  },

  reportNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 3,
  },

  reportDate: {
    fontSize: 10,
    color: '#64748b',
  },

  // Table of Contents (inspired by Government Report)
  tocTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },

  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
  },

  tocText: {
    fontSize: 11,
    color: '#374151',
  },

  tocPage: {
    fontSize: 11,
    color: '#6b7280',
  },

  // Executive Summary Box (inspired by Academic Report)
  executiveSummary: {
    backgroundColor: '#f8fafc',
    padding: 25,
    marginBottom: 30,
    borderRadius: 8,
    borderLeftWidth: 6,
    borderLeftColor: '#1e40af',
  },

  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },

  summaryText: {
    color: '#374151',
    lineHeight: 1.6,
    textAlign: 'justify',
  },

  // Section Styles
  section: {
    marginBottom: 30,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },

  subsectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    marginTop: 15,
  },

  // Metadata Box (inspired by Government Report disclaimer format)
  metadataBox: {
    backgroundColor: '#f1f5f9',
    padding: 20,
    marginBottom: 25,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },

  metadataRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  metadataLabel: {
    fontWeight: 'bold',
    width: 120,
    color: '#475569',
    fontSize: 10,
  },

  metadataValue: {
    color: '#64748b',
    flex: 1,
    fontSize: 10,
  },

  // KPI Cards (inspired by Investment Report metrics)
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    gap: 10,
  },

  kpiCard: {
    backgroundColor: '#1e40af',
    padding: 15,
    borderRadius: 8,
    width: '23%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },

  kpiLabel: {
    fontSize: 9,
    color: '#dbeafe',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Analysis Sections (inspired by Academic Report structure)
  analysisBox: {
    backgroundColor: '#fefce8',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: 15,
  },

  analysisTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 10,
  },

  analysisText: {
    color: '#a16207',
    lineHeight: 1.5,
    textAlign: 'justify',
  },

  // Recommendations List (inspired by Government Report format)
  recommendationsList: {
    marginTop: 15,
  },

  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },

  recommendationNumber: {
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    padding: 6,
    borderRadius: 10,
    marginRight: 12,
    marginTop: 2,
    minWidth: 20,
    textAlign: 'center',
  },

  recommendationText: {
    color: '#374151',
    flex: 1,
    lineHeight: 1.5,
  },

  // Disclaimer Section (inspired by Investment Report)
  disclaimer: {
    backgroundColor: '#fef2f2',
    padding: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fca5a5',
    marginTop: 20,
  },

  disclaimerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },

  disclaimerText: {
    fontSize: 9,
    color: '#7f1d1d',
    lineHeight: 1.4,
    textAlign: 'justify',
  },

  // Footer (inspired by Government Report format)
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  footerLeft: {
    fontSize: 8,
    color: '#9ca3af',
  },

  footerCenter: {
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 'bold',
  },

  footerRight: {
    fontSize: 8,
    color: '#9ca3af',
  },

  // Page Numbers
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    right: 50,
    fontSize: 9,
    color: '#9ca3af',
  },

  // Table Styles (inspired by Academic Report tables)
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 20,
  },

  tableHeader: {
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    padding: 8,
  },

  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },

  tableCell: {
    flex: 1,
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
  },

  // Bullet Points
  bulletList: {
    marginTop: 10,
  },

  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },

  bullet: {
    color: '#1e40af',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },

  bulletText: {
    color: '#374151',
    flex: 1,
    lineHeight: 1.4,
  },
});

interface EnhancedReportData {
  reportId: string;
  department: string;
  metrics: {
    contracts: number;
    users: number;
    events: number;
    files: number;
  };
  userRole: string;
  userName: string;
  aiContent: string;
  generatedAt: string;
  reportTitle: string;
}

interface EnhancedReportDocumentProps {
  data: EnhancedReportData;
}

export const EnhancedReportDocument: React.FC<EnhancedReportDocumentProps> = ({
  data,
}) => {
  const {
    reportId,
    department,
    metrics,
    userRole,
    userName,
    aiContent,
    generatedAt,
    reportTitle,
  } = data;

  // Clean AI content
  const cleanAIContent = aiContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract key sections from AI content
  const sections = cleanAIContent.split(
    /(?:Executive Summary|Key Performance|Department-Specific|Risk Assessment|Strategic Recommendations|Action Items)/i
  );

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.mainTitle}>
            {department === 'all'
              ? 'COMPREHENSIVE ORGANIZATIONAL'
              : department.toUpperCase()}
          </Text>
          <Text style={styles.mainTitle}>COMPLIANCE & AUDIT REPORT</Text>

          <Text style={styles.subtitle}>
            Contract, Audit & License Management Analysis
          </Text>

          <View style={{ marginTop: 80, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#475569', marginBottom: 10 }}>
              Prepared by: {userName}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 5 }}>
              Role: {userRole}
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 30 }}>
              Generated:{' '}
              {new Date(generatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            <View
              style={{
                borderWidth: 1,
                borderColor: '#d1d5db',
                padding: 15,
                borderRadius: 8,
                backgroundColor: '#f9fafb',
              }}
            >
              <Text
                style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}
              >
                Report ID: {reportId}
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Table of Contents */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tocTitle}>TABLE OF CONTENTS</Text>

        <View style={{ marginTop: 30 }}>
          <View style={styles.tocItem}>
            <Text style={styles.tocText}>Executive Summary</Text>
            <Text style={styles.tocPage}>3</Text>
          </View>
          <View style={styles.tocItem}>
            <Text style={styles.tocText}>Key Performance Indicators</Text>
            <Text style={styles.tocPage}>4</Text>
          </View>
          <View style={styles.tocItem}>
            <Text style={styles.tocText}>Department Analysis</Text>
            <Text style={styles.tocPage}>5</Text>
          </View>
          <View style={styles.tocItem}>
            <Text style={styles.tocText}>Risk Assessment & Compliance</Text>
            <Text style={styles.tocPage}>6</Text>
          </View>
          <View style={styles.tocItem}>
            <Text style={styles.tocText}>Strategic Recommendations</Text>
            <Text style={styles.tocPage}>7</Text>
          </View>
          <View style={styles.tocItem}>
            <Text style={styles.tocText}>Action Items & Next Steps</Text>
            <Text style={styles.tocPage}>8</Text>
          </View>
          <View style={styles.tocItem}>
            <Text style={styles.tocText}>Appendices</Text>
            <Text style={styles.tocPage}>9</Text>
          </View>
        </View>
      </Page>

      {/* Main Report Page */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>CAALM SOLUTIONS</Text>
            <Text style={styles.companyTagline}>
              Contract, Audit & License Management
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportNumber}>
              Report #{reportId.slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.reportDate}>
              {new Date(generatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Report Metadata */}
        <View style={styles.metadataBox}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Department:</Text>
            <Text style={styles.metadataValue}>
              {department === 'all' ? 'All Departments' : department}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Prepared by:</Text>
            <Text style={styles.metadataValue}>{userName}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Role:</Text>
            <Text style={styles.metadataValue}>{userRole}</Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Generated:</Text>
            <Text style={styles.metadataValue}>
              {new Date(generatedAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Classification:</Text>
            <Text style={styles.metadataValue}>Internal Use Only</Text>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXECUTIVE SUMMARY</Text>
          <View style={styles.executiveSummary}>
            <Text style={styles.summaryTitle}>Overview</Text>
            <Text style={styles.summaryText}>
              This comprehensive compliance and audit management report provides
              a detailed analysis of organizational performance across contract
              management, license tracking, and audit compliance functions. The
              assessment covers{' '}
              {department === 'all'
                ? 'all organizational departments'
                : `the ${department} department`}
              and includes key performance indicators, risk assessments, and
              strategic recommendations for operational excellence and
              regulatory compliance.
            </Text>
          </View>
        </View>

        {/* Key Performance Indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KEY PERFORMANCE INDICATORS</Text>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{metrics.contracts}</Text>
              <Text style={styles.kpiLabel}>Total Contracts</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: '#059669' }]}>
              <Text style={styles.kpiValue}>{metrics.users}</Text>
              <Text style={styles.kpiLabel}>Active Users</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: '#d97706' }]}>
              <Text style={styles.kpiValue}>{metrics.events}</Text>
              <Text style={styles.kpiLabel}>Audit Events</Text>
            </View>
            <View style={[styles.kpiCard, { backgroundColor: '#dc2626' }]}>
              <Text style={styles.kpiValue}>{metrics.files}</Text>
              <Text style={styles.kpiLabel}>Documents</Text>
            </View>
          </View>

          {/* KPI Analysis Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Metric</Text>
              <Text style={styles.tableHeaderCell}>Current Value</Text>
              <Text style={styles.tableHeaderCell}>Target</Text>
              <Text style={styles.tableHeaderCell}>Status</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Contract Management</Text>
              <Text style={styles.tableCell}>{metrics.contracts}</Text>
              <Text style={styles.tableCell}>15+</Text>
              <Text
                style={[
                  styles.tableCell,
                  { color: metrics.contracts >= 15 ? '#059669' : '#dc2626' },
                ]}
              >
                {metrics.contracts >= 15 ? 'On Target' : 'Below Target'}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>User Engagement</Text>
              <Text style={styles.tableCell}>{metrics.users}</Text>
              <Text style={styles.tableCell}>10+</Text>
              <Text
                style={[
                  styles.tableCell,
                  { color: metrics.users >= 10 ? '#059669' : '#dc2626' },
                ]}
              >
                {metrics.users >= 10 ? 'On Target' : 'Below Target'}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Audit Activities</Text>
              <Text style={styles.tableCell}>{metrics.events}</Text>
              <Text style={styles.tableCell}>25+</Text>
              <Text
                style={[
                  styles.tableCell,
                  { color: metrics.events >= 25 ? '#059669' : '#dc2626' },
                ]}
              >
                {metrics.events >= 25 ? 'On Target' : 'Below Target'}
              </Text>
            </View>
          </View>
        </View>

        {/* Department Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DEPARTMENT ANALYSIS</Text>

          <Text style={styles.subsectionTitle}>Performance Overview</Text>
          <View style={styles.analysisBox}>
            <Text style={styles.analysisTitle}>Current Assessment</Text>
            <Text style={styles.analysisText}>
              The {department === 'all' ? 'organizational' : department}{' '}
              analysis reveals {metrics.contracts} active contracts indicating{' '}
              {metrics.contracts >= 15 ? 'robust' : 'developing'} vendor
              relationship management. With {metrics.users} active system users,
              there is {metrics.users >= 10 ? 'strong' : 'moderate'}
              engagement across departmental functions. The {
                metrics.events
              }{' '}
              scheduled audit events demonstrate
              {metrics.events >= 25 ? 'comprehensive' : 'baseline'} compliance
              monitoring activities.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>
            CAALM Solutions - Compliance Report
          </Text>
          <Text style={styles.footerCenter}>CONFIDENTIAL</Text>
          <Text style={styles.footerRight}>{new Date().getFullYear()}</Text>
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Risk Assessment Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>CAALM SOLUTIONS</Text>
            <Text style={styles.companyTagline}>
              Risk Assessment & Compliance
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportNumber}>
              Report #{reportId.slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.reportDate}>Page 2</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RISK ASSESSMENT & COMPLIANCE</Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={{ fontWeight: 'bold' }}>
                  Data Security & Privacy:
                </Text>{' '}
                Ensure all contract and audit documents comply with data
                protection regulations. Implement regular security audits and
                access control reviews.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={{ fontWeight: 'bold' }}>Contract Compliance:</Text>{' '}
                Monitor contract renewal dates and compliance requirements.
                Establish automated alert systems for critical contract
                milestones.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={{ fontWeight: 'bold' }}>
                  Audit Trail Management:
                </Text>{' '}
                Maintain comprehensive audit trails for all compliance
                activities. Ensure documentation meets regulatory standards.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={{ fontWeight: 'bold' }}>License Management:</Text>{' '}
                Track license renewals and compliance status. Implement
                proactive monitoring for license expiration dates.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STRATEGIC RECOMMENDATIONS</Text>

          <View style={styles.recommendationsList}>
            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationNumber}>1</Text>
              <Text style={styles.recommendationText}>
                <Text style={{ fontWeight: 'bold' }}>
                  Enhance User Training Programs:
                </Text>{' '}
                Develop comprehensive training modules for contract management,
                audit procedures, and license tracking to increase system
                adoption and operational efficiency.
              </Text>
            </View>

            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationNumber}>2</Text>
              <Text style={styles.recommendationText}>
                <Text style={{ fontWeight: 'bold' }}>
                  Implement Automated Monitoring:
                </Text>{' '}
                Deploy automated alert systems for contract renewals, license
                expirations, and audit deadlines to ensure proactive compliance
                management.
              </Text>
            </View>

            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationNumber}>3</Text>
              <Text style={styles.recommendationText}>
                <Text style={{ fontWeight: 'bold' }}>
                  Strengthen Data Governance:
                </Text>{' '}
                Establish robust data governance policies for contract and audit
                records to ensure regulatory compliance and data integrity
                across all departments.
              </Text>
            </View>

            <View style={styles.recommendationItem}>
              <Text style={styles.recommendationNumber}>4</Text>
              <Text style={styles.recommendationText}>
                <Text style={{ fontWeight: 'bold' }}>
                  Optimize System Performance:
                </Text>{' '}
                Conduct regular performance reviews and implement optimization
                strategies for contract lifecycle management and audit trail
                efficiency.
              </Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>IMPORTANT NOTICE</Text>
          <Text style={styles.disclaimerText}>
            This report contains confidential and proprietary information of
            CAALM Solutions. The data, analyses, and recommendations contained
            herein are provided for internal use only and should not be
            distributed without proper authorization. While care has been taken
            to ensure accuracy, the information is subject to change and should
            be verified independently for critical business decisions.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLeft}>
            CAALM Solutions - Risk Assessment
          </Text>
          <Text style={styles.footerCenter}>CONFIDENTIAL</Text>
          <Text style={styles.footerRight}>{new Date().getFullYear()}</Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* AI Analysis Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>CAALM SOLUTIONS</Text>
            <Text style={styles.companyTagline}>AI-Powered Analysis</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportNumber}>
              Report #{reportId.slice(-8).toUpperCase()}
            </Text>
            <Text style={styles.reportDate}>Page 3</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-POWERED INSIGHTS</Text>

          <View
            style={{
              backgroundColor: '#f0f9ff',
              padding: 20,
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor: '#0284c7',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: '#0c4a6e',
                marginBottom: 15,
              }}
            >
              Artificial Intelligence Analysis
            </Text>

            <Text
              style={{
                color: '#075985',
                lineHeight: 1.6,
                textAlign: 'justify',
              }}
            >
              {cleanAIContent.substring(0, 2000)}
              {cleanAIContent.length > 2000 ? '...' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLeft}>CAALM Solutions - AI Analysis</Text>
          <Text style={styles.footerCenter}>CONFIDENTIAL</Text>
          <Text style={styles.footerRight}>{new Date().getFullYear()}</Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
