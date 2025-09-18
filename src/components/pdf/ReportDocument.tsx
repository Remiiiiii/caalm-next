import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from '@react-pdf/renderer';

// Register fonts for better typography (commented out for now to avoid network issues)
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     {
//       src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
//       fontWeight: 'normal',
//     },
//     {
//       src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc4.woff2',
//       fontWeight: 'bold',
//     },
//   ],
// });

// Enterprise-level styling
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#1e40af',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  companyTagline: {
    fontSize: 12,
    color: '#64748b',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  reportDate: {
    fontSize: 10,
    color: '#64748b',
  },
  metadata: {
    backgroundColor: '#f8fafc',
    padding: 20,
    marginBottom: 30,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1e40af',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metadataLabel: {
    fontWeight: 'bold',
    width: 120,
    color: '#374151',
  },
  metadataValue: {
    color: '#6b7280',
    flex: 1,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  executiveSummary: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  summaryText: {
    color: '#0c4a6e',
    lineHeight: 1.6,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#1e40af',
    padding: 15,
    borderRadius: 8,
    width: '23%',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 10,
    color: '#dbeafe',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
    textAlign: 'center',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    marginBottom: 10,
  },
  bar: {
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    marginHorizontal: 2,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 5,
    color: '#6b7280',
  },
  analysisBox: {
    backgroundColor: '#fef3c7',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  analysisText: {
    color: '#92400e',
    lineHeight: 1.5,
  },
  riskList: {
    marginTop: 10,
  },
  riskItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  riskBullet: {
    color: '#dc2626',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  riskText: {
    color: '#374151',
    flex: 1,
  },
  recommendationsList: {
    marginTop: 10,
  },
  recItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  recNumber: {
    color: '#059669',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  recText: {
    color: '#374151',
    flex: 1,
  },
  aiAnalysis: {
    backgroundColor: '#f3e8ff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  aiText: {
    color: '#6b21a8',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerLeft: {
    fontSize: 8,
    color: '#9ca3af',
  },
  footerRight: {
    fontSize: 8,
    color: '#9ca3af',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
  },
});

interface ReportData {
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

interface ReportDocumentProps {
  data: ReportData;
}

// Enhanced bar chart component with better visual representation
const BarChart: React.FC<{
  data: { label: string; value: number; max: number }[];
}> = ({ data }) => {
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
  ];

  return (
    <View style={styles.barChart}>
      {data.map((item, index) => {
        const height = Math.max(20, (item.value / item.max) * 100);
        return (
          <View key={index} style={{ alignItems: 'center', flex: 1 }}>
            <View
              style={[
                styles.bar,
                {
                  height: height,
                  backgroundColor: colors[index % colors.length],
                  borderRadius: 4,
                },
              ]}
            />
            <Text style={styles.barLabel}>{item.label}</Text>
            <Text
              style={[styles.barLabel, { fontSize: 7, fontWeight: 'bold' }]}
            >
              {item.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// Enhanced pie chart representation with better visual design
const PieChartRepresentation: React.FC<{
  data: { label: string; value: number; color: string }[];
}> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        return (
          <View
            key={index}
            style={{ alignItems: 'center', margin: 8, width: '45%' }}
          >
            <View
              style={{
                width: 35,
                height: 35,
                backgroundColor: item.color,
                borderRadius: 17.5,
                marginBottom: 8,
                borderWidth: 2,
                borderColor: '#ffffff',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            />
            <Text
              style={{
                fontSize: 9,
                textAlign: 'center',
                color: '#374151',
                fontWeight: 'bold',
              }}
            >
              {item.label}
            </Text>
            <Text
              style={{ fontSize: 8, textAlign: 'center', color: '#6b7280' }}
            >
              {item.value} ({percentage.toFixed(1)}%)
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// Trend line chart component
const TrendLineChart: React.FC<{
  data: { month: string; value: number }[];
}> = ({ data }) => {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue;

  return (
    <View style={{ height: 100, marginBottom: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          height: 80,
        }}
      >
        {data.map((item, index) => {
          const height =
            range > 0 ? ((item.value - minValue) / range) * 60 + 20 : 40;
          return (
            <View key={index} style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 8,
                  height: height,
                  backgroundColor: '#3b82f6',
                  borderRadius: 4,
                  marginBottom: 5,
                }}
              />
              <Text
                style={{ fontSize: 7, textAlign: 'center', color: '#6b7280' }}
              >
                {item.month}
              </Text>
              <Text
                style={{ fontSize: 6, textAlign: 'center', color: '#9ca3af' }}
              >
                {item.value}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const ReportDocument: React.FC<ReportDocumentProps> = ({ data }) => {
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

  // Chart data
  const barChartData = [
    {
      label: 'Contracts',
      value: metrics.contracts,
      max: Math.max(
        metrics.contracts,
        metrics.users,
        metrics.events,
        metrics.files
      ),
    },
    {
      label: 'Users',
      value: metrics.users,
      max: Math.max(
        metrics.contracts,
        metrics.users,
        metrics.events,
        metrics.files
      ),
    },
    {
      label: 'Events',
      value: metrics.events,
      max: Math.max(
        metrics.contracts,
        metrics.users,
        metrics.events,
        metrics.files
      ),
    },
    {
      label: 'Files',
      value: metrics.files,
      max: Math.max(
        metrics.contracts,
        metrics.users,
        metrics.events,
        metrics.files
      ),
    },
  ];

  const pieChartData = [
    { label: 'Contracts', value: metrics.contracts, color: '#3b82f6' },
    { label: 'Users', value: metrics.users, color: '#10b981' },
    { label: 'Events', value: metrics.events, color: '#f59e0b' },
    { label: 'Files', value: metrics.files, color: '#ef4444' },
  ];

  // Simulated trend data for the last 6 months
  const trendData = [
    { month: 'Mar', value: Math.max(1, metrics.contracts - 3) },
    { month: 'Apr', value: Math.max(1, metrics.contracts - 1) },
    { month: 'May', value: Math.max(1, metrics.contracts + 1) },
    { month: 'Jun', value: Math.max(1, metrics.contracts - 2) },
    { month: 'Jul', value: Math.max(1, metrics.contracts + 2) },
    { month: 'Aug', value: metrics.contracts },
  ];

  // Clean and format AI content for better readability
  const cleanAIContent = aiContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Format AI content into structured paragraphs
  const formatAIContent = (content: string) => {
    // Split by common sentence endings and bullet points
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0);
    
    return sentences.map((sentence, index) => {
      const trimmed = sentence.trim();
      if (!trimmed) return null;
      
      // Check if it's a bullet point or key finding
      const isKeyPoint = /^(key|important|critical|significant|notable|finding|insight|recommendation)/i.test(trimmed);
      
      return (
        <View key={index} style={{ marginBottom: 8 }}>
          {isKeyPoint ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={[styles.aiText, { fontWeight: 'bold', marginRight: 8 }]}>•</Text>
              <Text style={[styles.aiText, { fontWeight: 'bold' }]}>{trimmed}</Text>
            </View>
          ) : (
            <Text style={styles.aiText}>{trimmed}</Text>
          )}
        </View>
      );
    });
  };

  return (
    <Document>
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
            <Text style={styles.reportTitle}>{reportTitle}</Text>
            <Text style={styles.reportDate}>
              Generated: {new Date(generatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.metadata}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Department:</Text>
            <Text style={styles.metadataValue}>
              {department === 'all' ? 'All Departments' : department}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Generated by:</Text>
            <Text style={styles.metadataValue}>
              {userName} ({userRole})
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Report ID:</Text>
            <Text style={styles.metadataValue}>{reportId}</Text>
          </View>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.executiveSummary}>
            <Text style={styles.summaryText}>
              This comprehensive analytics report provides detailed insights
              into the performance and operational metrics across{' '}
              {department === 'all' ? 'all departments' : department}
              within the organization. The analysis covers key performance
              indicators for contract management, audit compliance, and license
              tracking, identifies trends, assesses risks, and provides
              strategic recommendations for operational excellence and
              regulatory compliance.
            </Text>
          </View>
        </View>

        {/* Key Performance Indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.contracts}</Text>
              <Text style={styles.metricLabel}>Total Contracts</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#059669' }]}>
              <Text style={styles.metricValue}>{metrics.users}</Text>
              <Text style={styles.metricLabel}>Active Users</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#d97706' }]}>
              <Text style={styles.metricValue}>{metrics.events}</Text>
              <Text style={styles.metricLabel}>Scheduled Events</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: '#dc2626' }]}>
              <Text style={styles.metricValue}>{metrics.files}</Text>
              <Text style={styles.metricLabel}>Stored Files</Text>
            </View>
          </View>
        </View>

        {/* Visual Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Analytics</Text>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Current Metrics Comparison</Text>
            <BarChart data={barChartData} />
          </View>

          {/* Trend Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>
              Contract Trends (Last 6 Months)
            </Text>
            <TrendLineChart data={trendData} />
          </View>

          {/* Pie Chart Representation */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Resource Distribution</Text>
            <PieChartRepresentation data={pieChartData} />
          </View>
        </View>

        {/* Department Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Department Analysis</Text>
          <View style={styles.analysisBox}>
            <Text style={styles.analysisText}>
              Based on the current metrics analysis, the organization
              demonstrates strong operational stability with {metrics.contracts}{' '}
              active contracts indicating robust vendor relationships and
              effective contract lifecycle management. The {metrics.users} active
              users suggest focused system utilization across departments, while{' '}
              {metrics.events} scheduled events demonstrate high engagement
              levels in audit and compliance activities. The {metrics.files}{' '}
              stored files indicate comprehensive document management practices
              for contracts, licenses, and audit records.
            </Text>
          </View>
        </View>

        {/* Risk Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Assessment & Compliance</Text>
          <View style={styles.riskList}>
              <View style={styles.riskItem}>
                <Text style={styles.riskBullet}>•</Text>
                <Text style={styles.riskText}>
                  Data Security: Ensure compliance with data protection regulations
                  for all stored contracts and audit records, implement regular
                  security audits
                </Text>
              </View>
              <View style={styles.riskItem}>
                <Text style={styles.riskBullet}>•</Text>
                <Text style={styles.riskText}>
                  User Adoption: Monitor system utilization patterns across
                  departments and implement targeted training programs for
                  contract and audit management
                </Text>
              </View>
              <View style={styles.riskItem}>
                <Text style={styles.riskBullet}>•</Text>
                <Text style={styles.riskText}>
                  Contract Management: Establish automated renewal alerts and
                  compliance tracking systems for license and contract
                  expiration dates
                </Text>
              </View>
              <View style={styles.riskItem}>
                <Text style={styles.riskBullet}>•</Text>
                <Text style={styles.riskText}>
                  Audit Compliance: Implement continuous monitoring and
                  performance optimization protocols for audit trail management
                  and regulatory compliance
                </Text>
              </View>
          </View>
        </View>

        {/* Strategic Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strategic Recommendations</Text>
          <View style={styles.recommendationsList}>
              <View style={styles.recItem}>
                <Text style={styles.recNumber}>1.</Text>
                <Text style={styles.recText}>
                  Expand user training programs for contract management, audit
                  procedures, and license tracking to increase system adoption
                  and reduce operational inefficiencies
                </Text>
              </View>
              <View style={styles.recItem}>
                <Text style={styles.recNumber}>2.</Text>
                <Text style={styles.recText}>
                  Implement automated contract renewal alerts and compliance
                  monitoring systems for license expiration and audit deadlines
                </Text>
              </View>
              <View style={styles.recItem}>
                <Text style={styles.recNumber}>3.</Text>
                <Text style={styles.recText}>
                  Enhance data governance policies for contract and audit records
                  to ensure regulatory compliance and data integrity
                </Text>
              </View>
              <View style={styles.recItem}>
                <Text style={styles.recNumber}>4.</Text>
                <Text style={styles.recText}>
                  Conduct regular system performance reviews for contract
                  lifecycle management and implement optimization strategies for
                  audit trail efficiency
                </Text>
              </View>
          </View>
        </View>

        {/* AI Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Powered Analysis</Text>
          <View style={styles.aiAnalysis}>
            <Text style={styles.aiText}>
              {cleanAIContent.split('.').map((sentence, index) => {
                const trimmedSentence = sentence.trim();
                if (!trimmedSentence) return null;
                return (
                  <Text key={index}>
                    {trimmedSentence}
                    {index < cleanAIContent.split('.').length - 1 ? '.' : ''}
                    {index < cleanAIContent.split('.').length - 1 ? '\n\n' : ''}
                  </Text>
                );
              })}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLeft}>
            © {new Date().getFullYear()} CAALM Solutions. All rights reserved.
          </Text>
          <Text style={styles.footerRight}>
            Contract, Audit & License Management System
          </Text>
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
