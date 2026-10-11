import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { DomainError } from '@/shared/errors';

let redisInstance: Redis | null = null;
let authLimiter: Ratelimit | null = null;
let uploadLimiter: Ratelimit | null = null;
let defaultLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redisInstance = new Redis({
    url,
    token,
  });
  return redisInstance;
}

export type RateLimitAction = 'auth' | 'upload' | 'default';

export async function assertRateLimit(
  identifier: string,
  action: RateLimitAction = 'default'
): Promise<void> {
  const redis = getRedis();

  // Jika kredensial Upstash belum dikonfigurasi (mis. test Vitest lokal), bypass secara aman
  if (!redis) {
    return;
  }

  try {
    let limiter: Ratelimit;
    if (action === 'auth') {
      if (!authLimiter) {
        authLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(5, '60 s'),
          prefix: 'wm:rl:auth',
        });
      }
      limiter = authLimiter;
    } else if (action === 'upload') {
      if (!uploadLimiter) {
        uploadLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(20, '60 s'),
          prefix: 'wm:rl:upload',
        });
      }
      limiter = uploadLimiter;
    } else {
      if (!defaultLimiter) {
        defaultLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(60, '60 s'),
          prefix: 'wm:rl:default',
        });
      }
      limiter = defaultLimiter;
    }

    const result = await limiter.limit(identifier);

    if (!result.success) {
      throw new DomainError(
        'TOO_MANY_REQUESTS',
        'Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi sebelum mencoba kembali.'
      );
    }
  } catch (error) {
    if (error instanceof DomainError) throw error;
    // Jangan sampai timeout/gangguan jaringan Redis memblokir alur operasional utama
    console.warn('[RateLimit] Upstash warning / bypass on error:', error);
  }
}
