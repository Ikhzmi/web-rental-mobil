import { lazy, Suspense } from 'react';
import Hero from '../components/Hero';
import SectionDivider from '../components/decor/SectionDivider';
import { useTheme } from '../hooks/useTheme';

// Lazy load below-the-fold content for faster initial load
const FleetConfigurator = lazy(() => import('../components/FleetConfigurator'));
const HowItWorks = lazy(() => import('../components/HowItWorks'));
const FeaturesSection = lazy(() => import('../components/FeaturesSection'));
const Testimonials = lazy(() => import('../components/Testimonials'));
const FaqPreview = lazy(() => import('../components/FaqPreview'));
const CtaBanner = lazy(() => import('../components/CtaBanner'));
const ModernFooter = lazy(() => import('../components/ModernFooter'));

function SectionLoader() {
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-2 border-white/20 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );
}

export default function HomePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <main className="bg-black min-h-screen">
      <Hero />
      <SectionDivider type="hero-to-fleet" isDark={isDark} />
      <Suspense fallback={<SectionLoader />}>
        <FleetConfigurator />
      </Suspense>
      <SectionDivider type="fleet-to-booking" isDark={isDark} />
      <Suspense fallback={<SectionLoader />}>
        <HowItWorks />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <FeaturesSection />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <Testimonials />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <FaqPreview />
      </Suspense>
      <Suspense fallback={<SectionLoader />}>
        <CtaBanner />
      </Suspense>
      <SectionDivider type="cta-to-footer" isDark={isDark} />
      <Suspense fallback={<SectionLoader />}>
        <ModernFooter />
      </Suspense>
    </main>
  );
}
