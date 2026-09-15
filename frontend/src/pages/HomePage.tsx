import { lazy, Suspense } from 'react';
import Hero from '../components/Hero';
import SectionDivider from '../components/decor/SectionDivider';
import { useTheme } from '../hooks/useTheme';
import { SectionSkeleton } from '../components/Skeleton';

// Lazy load below-the-fold content for faster initial load
const FleetConfigurator = lazy(() => import('../components/FleetConfigurator'));
const HowItWorks = lazy(() => import('../components/HowItWorks'));
const FeaturesSection = lazy(() => import('../components/FeaturesSection'));
const Testimonials = lazy(() => import('../components/Testimonials'));
const FaqPreview = lazy(() => import('../components/FaqPreview'));
const CtaBanner = lazy(() => import('../components/CtaBanner'));
const ModernFooter = lazy(() => import('../components/ModernFooter'));

function SectionLoader({ variant }: { variant?: 'showcase' | 'steps' | 'features' | 'testimonial' | 'faq' | 'banner' | 'footer' | 'cards' }) {
  return <SectionSkeleton variant={variant} />;
}

export default function HomePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-[#F9EFE8]'}`}>
      <Hero />
      <SectionDivider type="hero-to-fleet" isDark={isDark} />
      <Suspense fallback={<SectionLoader variant="showcase" />}>
        <FleetConfigurator />
      </Suspense>
      <SectionDivider type="fleet-to-booking" isDark={isDark} />
      <Suspense fallback={<SectionLoader variant="steps" />}>
        <HowItWorks />
      </Suspense>
      <Suspense fallback={<SectionLoader variant="features" />}>
        <FeaturesSection />
      </Suspense>
      <Suspense fallback={<SectionLoader variant="testimonial" />}>
        <Testimonials />
      </Suspense>
      <Suspense fallback={<SectionLoader variant="faq" />}>
        <FaqPreview />
      </Suspense>
      <Suspense fallback={<SectionLoader variant="banner" />}>
        <CtaBanner />
      </Suspense>
      <SectionDivider type="cta-to-footer" isDark={isDark} />
      <Suspense fallback={<SectionLoader variant="footer" />}>
        <ModernFooter />
      </Suspense>
    </main>
  );
}
