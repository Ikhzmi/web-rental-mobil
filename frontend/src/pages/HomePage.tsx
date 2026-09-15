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

function SectionLoader({ isDark }: { isDark: boolean }) {
  return (
    <div className={`min-h-[400px] flex items-center justify-center ${isDark ? 'bg-black' : 'bg-[#F9EFE8]'}`}>
      <div className={`w-8 h-8 border-2 ${isDark ? 'border-white/20' : 'border-neutral-300'} border-t-orange-500 rounded-full animate-spin`} />
    </div>
  );
}

export default function HomePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-[#F9EFE8]'}`}>
      <Hero />
      <SectionDivider type="hero-to-fleet" isDark={isDark} />
      <Suspense fallback={<SectionLoader isDark={isDark} />}>
        <FleetConfigurator />
      </Suspense>
      <SectionDivider type="fleet-to-booking" isDark={isDark} />
      <Suspense fallback={<SectionLoader isDark={isDark} />}>
        <HowItWorks />
      </Suspense>
      <Suspense fallback={<SectionLoader isDark={isDark} />}>
        <FeaturesSection />
      </Suspense>
      <Suspense fallback={<SectionLoader isDark={isDark} />}>
        <Testimonials />
      </Suspense>
      <Suspense fallback={<SectionLoader isDark={isDark} />}>
        <FaqPreview />
      </Suspense>
      <Suspense fallback={<SectionLoader isDark={isDark} />}>
        <CtaBanner />
      </Suspense>
      <SectionDivider type="cta-to-footer" isDark={isDark} />
      <Suspense fallback={<SectionLoader isDark={isDark} />}>
        <ModernFooter />
      </Suspense>
    </main>
  );
}
