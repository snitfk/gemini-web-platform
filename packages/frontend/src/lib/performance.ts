import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Performance monitoring hook for React components
 */
export function usePerformanceMonitor(componentName: string, enableLogs = false) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    const renderTime = now - lastRenderTime.current;
    lastRenderTime.current = now;

    if (enableLogs && renderTime > 16) {
      // > 16ms may cause frame drops
      console.warn(
        `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
      );
    }
  });

  return {
    renderCount: renderCount.current,
    totalTime: performance.now() - startTime.current,
  };
}

/**
 * Debounce hook - delays execution until after wait milliseconds
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook - limits execution rate
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now - lastUpdated.current >= interval) {
      setThrottledValue(value);
      lastUpdated.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdated.current = Date.now();
      }, interval - (now - lastUpdated.current));

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Debounced callback hook
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Measure component mount time
 */
export function useMountTime(componentName: string) {
  const mountTime = useRef(performance.now());

  useEffect(() => {
    const elapsed = performance.now() - mountTime.current;
    if (elapsed > 100) {
      console.warn(
        `[Performance] ${componentName} mount took ${elapsed.toFixed(2)}ms`
      );
    }
  }, [componentName]);
}

/**
 * Lazy initialization hook - delays computation until first access
 */
export function useLazyInit<T>(factory: () => T): T {
  const ref = useRef<{ value: T; initialized: boolean }>({
    value: undefined as T,
    initialized: false,
  });

  if (!ref.current.initialized) {
    ref.current.value = factory();
    ref.current.initialized = true;
  }

  return ref.current.value;
}

/**
 * Track Web Vitals metrics
 */
export function reportWebVitals(onMetric: (metric: {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}) => void) {
  // First Contentful Paint
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
        const value = entry.startTime;
        onMetric({
          name: 'FCP',
          value,
          rating: value < 1800 ? 'good' : value < 3000 ? 'needs-improvement' : 'poor',
        });
      }
    }
  });

  observer.observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      const value = lastEntry.startTime;
      onMetric({
        name: 'LCP',
        value,
        rating: value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor',
      });
    }
  });

  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(entry as any).hadRecentInput) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clsValue += (entry as any).value;
      }
    }
    onMetric({
      name: 'CLS',
      value: clsValue,
      rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
    });
  });

  clsObserver.observe({ entryTypes: ['layout-shift'] });

  return () => {
    observer.disconnect();
    lcpObserver.disconnect();
    clsObserver.disconnect();
  };
}

/**
 * Memory usage tracker
 */
export function getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memory = (performance as any).memory;
  if (memory) {
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
    };
  }
  return null;
}

/**
 * Frame rate monitor
 */
export function useFrameRate(callback?: (fps: number) => void) {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let animationId: number;

    const measureFPS = () => {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - lastTime.current;

      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCount.current * 1000) / elapsed);
        setFps(currentFps);
        callback?.(currentFps);
        frameCount.current = 0;
        lastTime.current = now;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [callback]);

  return fps;
}
