'use client';

import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
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
  const { ref, inView } = useInView({
    threshold: 0.2, // Adjust as needed
    triggerOnce: false,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(inView);
  }, [inView]);

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
    <section
      data-aos="fade-up"
      data-aos-duration="3000"
      id="features"
      ref={ref}
      className={`py-8 sm:py-10 md:py-14 px-2 sm:px-4 bg-background>
transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      } relative flex flex-col md:flex-row items-center justify-between py-4 px-4 bg-gradient-to-b from-white to-blue-50 overflow-hidden`}
    >
      <div className="max-w-7xl mx-auto mt-[5rem]">
        <BrandMarquee />
        <div className="text-center mb-10 sm:mb-14 md:mb-16">
          <h2 className="text-2xl md:text-[3.5em] font-bold text-center mb-4 leading-tight bg-gradient-to-r from-[#059BB2] via-[#00C1CB] to-[#162768] bg-clip-text text-transparent">
            Powerful Features for Complete Control
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-700 max-w-2xl sm:max-w-3xl mx-auto">
            Everything you need to streamline compliance, reduce risk, and
            safeguard your organization&apos;s critical agreements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            const delay = 0.5 * index;
            return (
              <Card
                key={index}
                className="hover:shadow-md transition-shadow border-border h-full"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: `opacity 0.7s ${delay}s cubic-bezier(0.4,0,0.2,1), transform 0.7s ${delay}s cubic-bezier(0.4,0,0.2,1)`,
                }}
              >
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="orbit-animated-border w-[70px] h-[70px] mx-auto mb-2">
                    <feature.icon className="orbit-3d w-full h-full p-4 rounded-2xl shadow-xl border border-slate-200 text-[#059BB2] ring-2 ring-cyan-100/40" />
                  </div>
                  <CardTitle className="flex items-center justify-center text-base sm:text-lg bg-gradient-to-r from-[#059BB2] via-[#00C1CB] to-[#162768] bg-clip-text text-transparent">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-slate-700 text-xs sm:text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
