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
