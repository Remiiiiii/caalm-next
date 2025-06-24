import { AlertTriangle, CheckCircle } from "lucide-react";

const ProblemSolution = () => {
  const problems = [
    "Documents scattered across personal drives and email",
    "Manual spreadsheet tracking prone to errors",
    "Missed deadlines due to ad hoc reminder systems",
    "Security risks from unsecured local storage",
    "Limited visibility into compliance status",
  ];

  const solutions = [
    "Centralized, secure cloud-based repository",
    "Automated tracking with intelligent alerts",
    "Proactive deadline notifications and escalations",
    "Enterprise-grade security with audit trails",
    "Real-time dashboards and compliance reporting",
  ];

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            From Chaos to Control
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your fragmented, manual processes into a streamlined,
            automated compliance management system.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-red-600 flex items-center">
              <AlertTriangle className="mr-3 h-6 w-6" />
              Current Challenges
            </h3>
            <div className="space-y-4">
              {problems.map((problem, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-gray-700">{problem}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-green-600 flex items-center">
              <CheckCircle className="mr-3 h-6 w-6" />
              Caalm
            </h3>
            <div className="space-y-4">
              {solutions.map((solution, index) => (
                <div key={index} className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-gray-700">{solution}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolution;
