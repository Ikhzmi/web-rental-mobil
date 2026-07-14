import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface ScrollRevealOptions {
  /** y-offset animasi masuk, px. Default 24. */
  y?: number;
  /** Jeda antar child, detik. Default 0.08. */
  stagger?: number;
  /** Reveal dijalankan ulang saat array ini berubah — dipakai untuk
   * konten yang baru muncul setelah data async selesai dimuat (mis.
   * grid hasil query TanStack Query), karena animasi tidak bisa
   * berjalan pada elemen yang belum ada di DOM saat mount. */
  dependencies?: unknown[];
}

/**
 * Fade+slide-in untuk anak langsung dari elemen yang di-ref, dipicu
 * ScrollTrigger saat masuk viewport — teknik yang sama seperti yang
 * sudah dipakai FeaturesSection/FleetGrid, sesuai §12.1 PRD ("fade/
 * slide-in per section saat masuk viewport, dengan stagger").
 *
 * Menghormati prefers-reduced-motion lewat gsap.matchMedia() (§7 PRD) —
 * animasi dilewati sepenuhnya untuk pengguna yang mengaktifkan setting
 * itu, konten langsung tampil di posisi akhir tanpa transisi.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const ref = useRef<T>(null);
  const { y = 24, stagger = 0.08, dependencies = [] } = options;

  useGSAP(
    () => {
      if (!ref.current || ref.current.children.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: '(prefers-reduced-motion: reduce)',
          full: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { reduce } = context.conditions as { reduce: boolean };
          const children = ref.current!.children;

          if (reduce) {
            gsap.set(children, { opacity: 1, y: 0 });
            return;
          }

          gsap.fromTo(
            children,
            { opacity: 0, y },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: 'power3.out',
              stagger,
              scrollTrigger: { trigger: ref.current, start: 'top 88%' },
            }
          );
        }
      );

      return () => mm.revert();
    },
    { scope: ref, dependencies }
  );

  return ref;
}
