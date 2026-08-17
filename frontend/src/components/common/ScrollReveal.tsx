import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  threshold?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
  threshold = 0.05
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    // Immediate viewport bounds check on mount / tab-switch
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setIsVisible(true);
        return;
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: Math.min(threshold, 0.01),
        rootMargin: '100px 0px 100px 0px'
      }
    );

    const current = elementRef.current;
    if (current) {
      observer.observe(current);
    }

    // Safety fallback timer: guarantee element is never permanently hidden
    const safetyTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => {
      clearTimeout(safetyTimer);
      if (current) observer.unobserve(current);
    };
  }, [threshold]);

  const getInitialTransform = () => {
    switch (direction) {
      case 'up': return 'translateY(20px)';
      case 'down': return 'translateY(-20px)';
      case 'left': return 'translateX(20px)';
      case 'right': return 'translateX(-20px)';
      case 'none': return 'none';
    }
  };

  return (
    <div
      ref={elementRef}
      className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : getInitialTransform(),
        transitionDelay: `${delayMs}ms`
      }}
    >
      {children}
    </div>
  );
};
