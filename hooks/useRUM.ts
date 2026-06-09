import { useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { RUMEvent } from '@/lib/types';
import logger from '@/lib/logger';

const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds
const BUFFER_MAX_SIZE = 20;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRUM() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const eventBufferRef = useRef<RUMEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialized = useRef(false);

  const flushEvents = useCallback(async () => {
    if (eventBufferRef.current.length === 0) {
      return;
    }

    const eventsToSend = [...eventBufferRef.current];
    eventBufferRef.current = []; // Clear buffer

    try {
      await fetch('/api/rum/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, events: eventsToSend }),
      });
    } catch (error) {
      logger.error({ error }, '[useRUM] Failed to flush events')
      // Re-add failed events to buffer
      eventBufferRef.current.unshift(...eventsToSend)
    }
  }, [userId]);

  // Initialize flush timer on mount - always call useEffect
  useEffect(() => {
    if (userId && !isInitialized.current) {
      flushTimerRef.current = setInterval(flushEvents, BUFFER_FLUSH_INTERVAL);
      isInitialized.current = true;

      // Flush on page unload
      const handleUnload = () => {
        flushEvents();
      };
      window.addEventListener('beforeunload', handleUnload);
      return () => {
        window.removeEventListener('beforeunload', handleUnload);
        if (flushTimerRef.current) {
          clearInterval(flushTimerRef.current);
          flushTimerRef.current = null;
        }
      };
    }
  }, [userId, flushEvents]);

  // Track a single event
  const trackEvent = useCallback((eventType: string, data?: Record<string, unknown>, section?: string) => {
    if (!userId) {
      return;
    }

    const event: RUMEvent = {
      eventType,
      timestamp: Date.now(),
      section,
      data,
    };

    eventBufferRef.current.push(event);

    if (eventBufferRef.current.length >= BUFFER_MAX_SIZE) {
      flushEvents();
    }
  }, [userId, flushEvents]);

  // ─── Convenience methods for common events ─────────────────────────────────────

  const trackTabClick = useCallback((tab: 'transfer_partners' | 'cashback' | 'offers' | 'credits' | 'rotating') => {
    trackEvent('tab_click', { tab });
  }, [trackEvent]);

  const trackCardView = useCallback((cardId: string) => {
    trackEvent('card_view', { cardId });
  }, [trackEvent]);

  const trackCardDetailExpansion = useCallback(() => {
    trackEvent('card_detail_expansion');
  }, [trackEvent]);

  const trackDwellTime = useCallback((section: string, duration: number) => {
    trackEvent('dwell_time', { duration }, section);
  }, [trackEvent]);

  const trackScrollDepth = useCallback((depth: number) => {
    trackEvent('scroll_depth', { depth });
  }, [trackEvent]);

  const trackBackNavigation = useCallback(() => {
    trackEvent('back_navigation');
  }, [trackEvent]);

  const trackWalletAdd = useCallback((cardId: string) => {
    trackEvent('wallet_add', { cardId });
  }, [trackEvent]);

  const trackTransferPartnerClick = useCallback((partner: string) => {
    trackEvent('transfer_partner_click', { partner });
  }, [trackEvent]);


  return {
    trackEvent,
    trackTabClick,
    trackCardView,
    trackCardDetailExpansion,
    trackDwellTime,
    trackScrollDepth,
    trackBackNavigation,
    trackWalletAdd,
    trackTransferPartnerClick,
  };
}

// ─── Hook for dwell time tracking on sections ───────────────────────────────────

export function useDwellTime(section: string, enabled = true) {
  const { trackDwellTime } = useRUM();
  const startTimeRef = useRef<number | null>(null);

  const startDwell = useCallback(() => {
    if (enabled) {
      startTimeRef.current = Date.now();
    }
  }, [enabled]);

  const endDwell = useCallback(() => {
    if (enabled && startTimeRef.current) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000); // Convert to seconds
      if (duration > 0) {
        trackDwellTime(section, duration);
      }
      startTimeRef.current = null;
    }
  }, [enabled, section, trackDwellTime]);

  return { startDwell, endDwell };
}

// ─── Hook for scroll depth tracking ─────────────────────────────────────────────

export function useScrollDepth(thresholds: number[] = [25, 50, 75, 90, 100]) {
  const { trackScrollDepth } = useRUM();
  const trackedDepths = useRef<Set<number>>(new Set());

  const handleScroll = useCallback(() => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTop = window.scrollY;
    const scrollPercent = (scrollTop / scrollHeight) * 100;

    thresholds.forEach((threshold) => {
      if (scrollPercent >= threshold && !trackedDepths.current.has(threshold)) {
        trackedDepths.current.add(threshold);
        trackScrollDepth(threshold);
      }
    });
  }, [thresholds, trackScrollDepth]);

  const startTracking = useCallback(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
  }, [handleScroll]);

  const stopTracking = useCallback(() => {
    window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { startTracking, stopTracking };
}
