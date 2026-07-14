import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Nav from './Nav';

/**
 * Nav dirender sekali di sini (bukan di dalam Hero) supaya konsisten di
 * semua halaman — Nav memakai `position: fixed` jadi aman dirender di
 * root layout terlepas dari struktur halaman di bawahnya.
 */
export default function Layout() {
  const { pathname } = useLocation();

  // Scroll to top instan & refresh ScrollTrigger setiap kali route berubah
  // untuk mencegah lag koordinat scroll & tumpukan trigger menggantung di SPA.
  useEffect(() => {
    window.scrollTo(0, 0);
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  }, [pathname]);

  return (
    <div className="bg-black min-h-screen">
      <Nav />
      <Outlet />
    </div>
  );
}
