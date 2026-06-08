import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RATE_LIMIT_CONFIG } from './constants';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(RATE_LIMIT_CONFIG.MAX_REQUESTS, RATE_LIMIT_CONFIG.WINDOW_DURATION),
  analytics: true,
});
