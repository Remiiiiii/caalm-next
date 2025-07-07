import { Button } from '@/components/ui/button';

const CTA = () => {
  return (
    <section
      id="cta"
      className="relative bg-[#1793F0] py-10 sm:py-16 md:py-20 text-white"
    >
      <div className="absolute inset-0 bg-opacity-20 bg-navy-dark"></div>
      <div className="container mx-auto px-3 sm:px-4 text-center relative">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 sm:mb-4">
          Ready to Streamline Your Contract Management?
        </h2>
        <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-xl sm:max-w-2xl mx-auto">
          Join leading organizations who have transformed their contract
          management with Caalm.
        </p>
        <Button
          size="lg"
          className="bg-white text-[#1793F0] hover:bg-coral/10 w-full sm:w-auto"
        >
          Request a Free Demo
        </Button>
      </div>
    </section>
  );
};

export default CTA;
