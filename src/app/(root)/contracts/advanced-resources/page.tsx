import { Metadata } from 'next';
import ContractsDisplay from '@/components/ContractsDisplay';

export const metadata: Metadata = {
  title: 'Advanced Resources - Government Contracts | CAALM',
  description:
    'Search and explore government contract opportunities from SAM.gov',
};

export default function AdvancedResourcesPage() {
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
        <ContractsDisplay />
      </div>
    </div>
  );
}
