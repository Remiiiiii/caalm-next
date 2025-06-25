import { Button } from "@/components/ui/button";

const CTA = () => {
  return (
    <section id="cta" className="relative bg-coral py-20 text-white">
      <div className="absolute inset-0 bg-opacity-20 bg-navy-dark"></div>
      <div className="container mx-auto px-4 text-center relative">
        <h2 className="text-4xl font-extrabold mb-4">
          Ready to Streamline Your Contract Management?
        </h2>
        <p className="text-xl mb-8 max-w-2xl mx-auto">
          Join leading organizations who have transformed their contract
          management with Caalm.
        </p>
        <Button size="lg" className="bg-white text-coral hover:bg-coral/10">
          Request a Free Demo
        </Button>
      </div>
    </section>
  );
};

export default CTA;
