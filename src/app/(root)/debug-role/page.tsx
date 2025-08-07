import { Metadata } from 'next';
import Link from 'next/link';
import AdminRoleManager from '@/components/AdminRoleManager';

export const metadata: Metadata = {
  title: 'Debug Role Manager | CAALM',
  description: 'Admin tool for managing user roles',
};

export default function DebugRolePage() {
  return (
    <div className="relative min-h-screen">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[-10] opacity-60 pointer-events-none"
      >
        <source src="/assets/video/wave.mp4" type="video/mp4" />
      </video>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Debug Role Manager
            </h1>
            <p className="text-slate-600">
              Temporary tool for managing user roles and debugging permission
              issues
            </p>
          </div>

          <AdminRoleManager />

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              After updating your role to &quot;admin&quot;, refresh the page
              and try accessing
              <Link
                href="/analytics/administration"
                className="text-blue-600 hover:underline ml-1"
              >
                /analytics/administration
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
