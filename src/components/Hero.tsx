import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, FileText } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 to-green-50 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Centralize Your <span className="text-blue-600">Contracts</span>,
            <br />
            <span className="text-green-600">Licenses</span> &{" "}
            <span className="text-gray-700">Audits</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Caalm eliminates fragmented document storage and manual tracking.
            Secure your compliance, prevent missed deadlines, and protect your
            organization from financial and reputational risks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              Schedule Demo
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure & Compliant</h3>
            <p className="text-gray-600">
              Centralized, encrypted storage with role-based access controls
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-600">
              Multi-user workflows with approval processes and audit trails
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <FileText className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Automated Tracking</h3>
            <p className="text-gray-600">
              Proactive alerts for renewals, deadlines, and compliance
              milestones
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
