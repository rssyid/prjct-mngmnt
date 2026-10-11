import { auth } from '@/infra/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest } from 'next/server';
import { assertRateLimit } from '@/infra/ratelimit';
import { toHttpError } from '@/shared/errors';

const handlers = toNextJsHandler(auth.handler);

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.includes('/sign-in')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous';
    try {
      await assertRateLimit(`ip:${ip}`, 'auth');
    } catch (error) {
      const { status, body } = toHttpError(error);
      return Response.json(body, { status });
    }
  }

  return handlers.POST(request);
}
