// proxy.ts
import { NextRequest, NextResponse } from 'next/server';

// 🔒 Exemplo: proteger rotas administrativas e aplicar CORS
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Exemplo: redirecionar se o usuário não estiver autenticado
  if (pathname.startsWith('/admin')) {
    const user = request.cookies.get('user_session');
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // ✅ Exemplo: aplicar CORS para rotas da API
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  return NextResponse.next();
}

// ✅ Define em quais rotas o proxy deve atuar
export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
