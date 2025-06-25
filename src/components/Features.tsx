import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Database,
  Bell,
  GitBranch,
  BarChart3,
  Lock,
  Calendar,
  FileCheck,
  Users2,
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Database,
      title: "Centralized Document Storage",
      description:
        "Secure cloud-based repository with advanced search, tagging, and version control.",
    },
    {
      icon: Bell,
      title: "Automated Deadline Alerts",
      description:
        "Proactive notifications for renewals, audits, and key compliance milestones.",
    },
    {
      icon: GitBranch,
      title: "Collaboration Tools",
      description:
        "Multi-user review, approval workflows, and real-time collaboration features.",
    },
    {
      icon: BarChart3,
      title: "Reporting & Analytics",
      description:
        "Real-time dashboards for compliance status, risk assessment, and pending actions.",
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description:
        "Role-based access controls, encryption, and comprehensive audit trails.",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description:
        "Intelligent calendar integration with automated reminder escalation.",
    },
    {
      icon: FileCheck,
      title: "Compliance Tracking",
      description:
        "Monitor regulatory requirements and maintain certification records.",
    },
    {
      icon: Users2,
      title: "Team Management",
      description:
        "Assign responsibilities, track progress, and manage team workflows.",
    },
  ];

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-navy mb-4">
            Powerful Features for Complete Control
          </h2>
          <p className="text-xl text-slate-dark max-w-3xl mx-auto">
            Everything you need to streamline compliance, reduce risk, and
            safeguard your organization&apos;s critical agreements.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow border-border"
            >
              <CardHeader className="pb-4">
                <feature.icon className="h-8 w-8 text-blue mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-slate-dark text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
