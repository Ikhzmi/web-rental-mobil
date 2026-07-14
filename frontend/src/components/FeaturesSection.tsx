import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Clock, MapPin, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STATS = [
  { value: 500, suffix: '+', label: 'Vehicles' },
  { value: 24, suffix: '/7', label: 'Support' },
  { value: 40, suffix: '+', label: 'Locations' },
  { value: 98, suffix: '%', label: 'Satisfaction' },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Fully Insured',
    desc: 'Every rental includes comprehensive coverage, no hidden fees.',
  },
  {
    icon: Clock,
    title: 'Instant Booking',
    desc: 'Reserve in under two minutes, pick up the same day.',
  },
  {
    icon: MapPin,
    title: 'Flexible Pickup',
    desc: 'Grab your car from any of our 40+ city locations.',
  },
  {
    icon: Sparkles,
    title: 'Detailed & Inspected',
    desc: 'Every vehicle is cleaned and mechanically checked pre-rental.',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const statRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      statRefs.current.forEach((el, i) => {
        if (!el) return;
        const target = STATS[i].value;
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
          },
          onUpdate: () => {
            el.textContent = Math.round(counter.val).toString();
          },
        });
      });

      gsap.fromTo(
        featureRefs.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="relative bg-black py-24 px-5 sm:px-10 md:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-20 rounded-3xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-8 sm:p-10">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="text-center">
              <div className="text-white text-3xl sm:text-4xl font-playfair italic">
                <span
                  ref={(el) => {
                    statRefs.current[i] = el;
                  }}
                >
                  0
                </span>
                {stat.suffix}
              </div>
              <p className="text-white/50 text-xs sm:text-sm mt-2 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                ref={(el) => {
                  featureRefs.current[i] = el;
                }}
                className="rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-[#2563eb]/15 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-[#2563eb]" />
                </div>
                <h3 className="text-white font-medium mb-1.5">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
