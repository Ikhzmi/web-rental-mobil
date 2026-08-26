import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'kerental-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default to dark theme - only use stored value if explicitly set
    if (stored === 'light' || stored === 'dark') return stored;
    // No stored preference - default to dark
    return 'dark';
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const root = document.documentElement;

    // Set class tema (dark/light) di setiap render, termasuk mount pertama.
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem(STORAGE_KEY, theme);

    // Class 'theme-transitioning' HANYA ditambahkan saat tema benar-benar
    // berubah (toggle), bukan saat mount pertama aplikasi. Sebelumnya efek
    // ini juga jalan di mount pertama (karena effect selalu jalan sekali
    // setelah render awal), sehingga transisi 600ms aktif tepat saat
    // komponen lain (mis. dashboard) baru pertama kali mount — bentrok
    // dengan animasi Framer Motion & compositing backdrop-blur, membuat
    // konten ada di DOM tapi tidak ter-render sampai ada reflow lain.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    root.classList.add('theme-transitioning');
    setIsTransitioning(true);

    const timer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
      setIsTransitioning(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? 'light' : 'dark');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}