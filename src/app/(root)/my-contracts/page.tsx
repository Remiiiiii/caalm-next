import { Metadata } from 'next';
import MyContractsLayout from '@/components/my-contracts/MyContractsLayout';

export const metadata: Metadata = {
  title: 'My Contracts - CAALM',
  description: 'View and manage your assigned contracts',
};

export default function MyContractsPage() {
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
        <MyContractsLayout />
      </div>
    </div>
  );
}
