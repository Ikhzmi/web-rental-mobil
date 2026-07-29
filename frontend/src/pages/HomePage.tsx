import Hero from '../components/Hero';
import FleetConfigurator from '../components/FleetConfigurator';
import HowItWorks from '../components/HowItWorks';
import FeaturesSection from '../components/FeaturesSection';
import Testimonials from '../components/Testimonials';
import FaqPreview from '../components/FaqPreview';
import CtaBanner from '../components/CtaBanner';
import ModernFooter from '../components/ModernFooter';

export default function HomePage() {
  return (
    <main className="bg-black min-h-screen">
      <Hero />
      <FleetConfigurator />
      <HowItWorks />
      <FeaturesSection />
      <Testimonials />
      <FaqPreview />
      <CtaBanner />
      <ModernFooter />
    </main>
  );
}
