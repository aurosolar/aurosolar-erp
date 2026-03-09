// src/app/api/superadmin/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export const GET = withAuth('*', async (_req, ctx) => {
  if (ctx.usuario.rol !== 'SUPERADMIN') return apiError('Acceso denegado', 403);

  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { usuarios: true, obras: true, clientes: true, documentos: true } },
      usuarios: { select: { rol: true } },
      documentos: { select: { tamanoBytes: true } },
    }
  });

  const data = empresas.map(e => {
    const porRol: Record<string, number> = {};
    e.usuarios.forEach(u => { porRol[u.rol] = (porRol[u.rol] || 0) + 1; });
    const totalBytes = e.documentos.reduce((s, d) => s + (d.tamanoBytes || 0), 0);
    const mb = totalBytes / (1024 * 1024);
    return {
      id: e.id,
      nombre: e.nombre,
      email: e.email,
      activa: e.activa,
      createdAt: e.createdAt,
      totales: {
        usuarios: e._count.usuarios,
        obras: e._count.obras,
        clientes: e._count.clientes,
        documentos: e._count.documentos,
        mb: Math.round(mb * 10) / 10,
      },
      usuariosPorRol: porRol,
    };
  });

  return apiOk({ empresas: data, total: data.length });
});
