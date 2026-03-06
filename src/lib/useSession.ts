// src/lib/useSession.ts
'use client';

import { useEffect, useState } from 'react';

interface SessionUser {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  rol: string;
}

export function useSession() {
  const [usuario, setUsuario] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data) setUsuario(d.data);
        else setUsuario(null);
      })
      .catch(() => setUsuario(null))
      .finally(() => setLoading(false));
  }, []);

  return { usuario, loading };
}

// ── Helper centralizado para fetch mutadores ──────────────────────────────────
// Añade automáticamente los headers necesarios para CSRF y JSON.
// Usar en lugar de fetch() directo para POST/PUT/PATCH/DELETE.
//
// Uso:
//   import { apiFetch } from '@/lib/useSession';
//   const res = await apiFetch('/api/obras', { method: 'POST', body: data });

export async function apiFetch(
  url: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<Response> {
  const { body, headers, ...rest } = options;

  return fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'aurosolar-erp',
      ...(headers as Record<string, string> || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
