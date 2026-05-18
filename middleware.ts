import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
  '/api/send-code': { maxRequests: 5, windowMs: 5 * 60 * 1000 },
  '/api/auth/login': { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  '/api/auth/register': { maxRequests: 5, windowMs: 15 * 60 * 1000 },
};

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  const path = request.nextUrl.pathname;

  const config = Object.entries(RATE_LIMIT_CONFIG).find(([route]) => path.startsWith(route));
  if (!config) {
    return NextResponse.next();
  }

  const [, { maxRequests, windowMs }] = config;
  const key = `${ip}:${path}`;
  const now = Date.now();

  const current = rateLimit.get(key);

  if (!current || now > current.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return NextResponse.next();
  }

  if (current.count >= maxRequests) {
    return NextResponse.json(
      {
        success: false,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      },
      { status: 429 }
    );
  }

  current.count++;
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/send-code/:path*', '/api/auth/:path*'],
};
