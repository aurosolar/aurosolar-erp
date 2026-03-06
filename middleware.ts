// middleware.ts — SPRINT 1 FINAL
// Va en la RAÍZ del proyecto (junto a package.json, NO dentro de src/)
//
// ── Qué hace este middleware ──────────────────────────────────────────────────
//   ✅ Protege páginas frontend: si no hay JWT válido → redirige a /login
//   ✅ Guarda la URL original en ?from= para redirigir tras login
//   ✅ Borra cookie con token inválido o expirado (no arrastra cookies rotas)
//   ✅ Bloquea /api/configuracion/seed en producción (403)
//   ✅ Deja pasar assets estáticos (_next, imágenes, favicon)
//
// ── Qué NO hace (y por qué) ───────────────────────────────────────────────────
//   ❌ No verifica DB → es un guard de UX, no de seguridad crítica.
//      La seguridad real de datos vive en:
//        - withAuth() en cada API route (verifica DB en cada request)
//        - getSession() en server components (verifica DB)
//      El Edge Runtime del middleware no puede hacer queries a Prisma/PostgreSQL.
//      Añadir un fetch() interno añadiría latencia en CADA request de página.
//      Para el 99% de los casos (sesión legítima), el JWT es suficiente aquí.
//   ❌ No protege API routes → ya tienen withAuth()
//
// ── Resultado práctico ────────────────────────────────────────────────────────
//   Un usuario sin cookie → no ve ninguna página del ERP.
//   Un usuario con cookie robada post-logout → el middleware lo deja pasar,
//   pero withAuth()/getSession() en el server devuelve null (DB check).

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET      = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const COOKIE_NAME = 'aurosolar_session';

// Rutas accesibles sin autenticación
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/public',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Assets y rutas públicas → pasar sin tocar
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // 2. Bloquear seed en producción
  //    Doble protección: también está bloqueado en la propia route (seed-route-patch).
  //    Aquí es la primera línea de defensa a nivel de infraestructura.
  if (
    pathname.startsWith('/api/configuracion/seed') &&
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.json(
      { ok: false, error: 'No disponible en producción' },
      { status: 403 }
    );
  }

  // 3. API routes → dejar pasar (withAuth() se encarga de cada una)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 4. Páginas: verificar JWT en cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    // Token inválido o expirado → borrar cookie y redirigir
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  // Aplicar a todas las rutas EXCEPTO assets estáticos
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
