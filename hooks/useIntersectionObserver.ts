// hooks/useIntersectionObserver.ts
//
// Custom hook to handle intersection observer logic for tracking element visibility

import { useEffect, RefObject } from 'react';

interface UseIntersectionObserverProps<T extends HTMLElement> {
  ref: RefObject<T | null>;
  onIntersect: () => void;
  onLeave?: () => void;
  threshold?: number;
}

export function useIntersectionObserver<T extends HTMLElement>({
  ref,
  onIntersect,
  onLeave,
  threshold = 0.5,
}: UseIntersectionObserverProps<T>) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onIntersect();
          } else if (onLeave) {
            onLeave();
          }
        });
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, onIntersect, onLeave, threshold]);
}
