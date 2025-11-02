import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Adiciona os headers necessários para o Supabase
  response.headers.set('accept', 'application/json');
  response.headers.set('content-type', 'application/json');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};