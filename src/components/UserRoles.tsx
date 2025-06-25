import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, UserCheck, Users } from "lucide-react";

const UserRoles = () => {
  const roles = [
    {
      title: "Executives",
      icon: Crown,
      color: "text-coral",
      bgColor: "bg-accent-purple",
      description:
        "Oversee, approve, assign, and strategically manage all contracts, licenses, audits, and critical business agreements.",
      responsibilities: [
        "Review and authorize high-priority contracts",
        "Assign ownership to relevant teams",
        "Access real-time compliance dashboards",
        "Ensure regulatory policy adherence",
      ],
    },
    {
      title: "Mid-Level Managers",
      icon: UserCheck,
      color: "text-blue",
      bgColor: "bg-accent-blue",
      description:
        "Monitor and report on the status of contracts, licenses, and audits within their assigned units.",
      responsibilities: [
        "Track deadlines and renewals",
        "Submit status updates to executives",
        "Escalate compliance issues",
        "Coordinate with HR on training requirements",
      ],
    },
    {
      title: "HR & Administrative Staff",
      icon: Users,
      color: "text-green",
      bgColor: "bg-accent-green",
      description:
        "Maintain records of staff training and documentation tied to contract requirements.",
      responsibilities: [
        "Log employee training certifications",
        "Notify managers of pending actions",
        "Upload supporting documentation",
        "Maintain audit evidence records",
      ],
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-navy mb-4">
            Built for Every Role
          </h2>
          <p className="text-xl text-slate-dark max-w-3xl mx-auto">
            Caalm provides tailored experiences for executives, managers, and
            administrative staff with role-based access and workflows.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {roles.map((role, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className={`${role.bgColor} rounded-t-lg`}>
                <CardTitle className="flex items-center text-xl">
                  <role.icon className={`h-6 w-6 ${role.color} mr-3`} />
                  {role.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-dark mb-4">{role.description}</p>
                <ul className="space-y-2">
                  {role.responsibilities.map((resp, respIndex) => (
                    <li key={respIndex} className="flex items-start">
                      <div
                        className={`w-2 h-2 ${role.color.replace(
                          "text-",
                          "bg-"
                        )} rounded-full mt-2 mr-3 flex-shrink-0`}
                      ></div>
                      <span className="text-sm text-navy">{resp}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserRoles;
