import { useState, useEffect } from 'react';

/**
 * Hook for debouncing a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debouncing a string value with immediate update
 * Returns the debounced value with a pending state
 */
export function useDebounceString(
  value: string,
  delay: number = 300
): { debouncedValue: string; isPending: boolean } {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (value === debouncedValue) return;

    setIsPending(true);
    const timer = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, debouncedValue]);

  return { debouncedValue, isPending };
}
