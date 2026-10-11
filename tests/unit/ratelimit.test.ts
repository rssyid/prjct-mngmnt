import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assertRateLimit } from '@/infra/ratelimit';
import { DomainError, HTTP_STATUS_MAP } from '@/shared/errors';

describe('Upstash Rate Limiting (D-20)', () => {
  it('TOO_MANY_REQUESTS terdaftar di HTTP_STATUS_MAP dengan status 429', () => {
    expect(HTTP_STATUS_MAP['TOO_MANY_REQUESTS']).toBe(429);
    const err = new DomainError('TOO_MANY_REQUESTS', 'Limit reached');
    expect(err.status).toBe(429);
  });

  it('assertRateLimit melakukan graceful bypass saat env Redis tidak dikonfigurasi', async () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    await expect(assertRateLimit('test-ip', 'auth')).resolves.toBeUndefined();
    await expect(assertRateLimit('test-user', 'upload')).resolves.toBeUndefined();

    process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  });
});
