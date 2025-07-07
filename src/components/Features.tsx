import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Database,
  Bell,
  GitBranch,
  BarChart3,
  Lock,
  Calendar,
  FileCheck,
  Users2,
} from 'lucide-react';
import BrandMarquee from './BrandMarquee';

const Features = () => {
  const features = [
    {
      icon: Database,
      title: 'Centralized Document Storage',
      description:
        'Secure cloud-based repository with advanced search, tagging, and version control.',
    },
    {
      icon: Bell,
      title: 'Automated Deadline Alerts',
      description:
        'Proactive notifications for renewals, audits, and key compliance milestones.',
    },
    {
      icon: GitBranch,
      title: 'Collaboration Tools',
      description:
        'Multi-user review, approval workflows, and real-time collaboration features.',
    },
    {
      icon: BarChart3,
      title: 'Reporting & Analytics',
      description:
        'Real-time dashboards for compliance status, risk assessment, and pending actions.',
    },
    {
      icon: Lock,
      title: 'Enterprise Security',
      description:
        'Role-based access controls, encryption, and comprehensive audit trails.',
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description:
        'Intelligent calendar integration with automated reminder escalation.',
    },
    {
      icon: FileCheck,
      title: 'Compliance Tracking',
      description:
        'Monitor regulatory requirements and maintain certification records.',
    },
    {
      icon: Users2,
      title: 'Team Management',
      description:
        'Assign responsibilities, track progress, and manage team workflows.',
    },
  ];

  return (
    <section className="py-8 sm:py-10 md:py-14 px-2 sm:px-4 bg-background">
      <BrandMarquee />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy mt-2 mb-3 sm:mt-4 sm:mb-4">
            Powerful Features for Complete Control
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-dark max-w-2xl sm:max-w-3xl mx-auto">
            Everything you need to streamline compliance, reduce risk, and
            safeguard your organization&apos;s critical agreements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow border-border h-full"
            >
              <CardHeader className="pb-3 sm:pb-4">
                <feature.icon className="h-7 w-7 sm:h-8 sm:w-8 text-blue mb-1 sm:mb-2" />
                <CardTitle className="text-base sm:text-lg">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-slate-dark text-xs sm:text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
