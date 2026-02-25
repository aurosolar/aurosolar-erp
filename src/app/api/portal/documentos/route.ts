// src/app/api/portal/documentos/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withAuth('portal:ver', async (req, { usuario }) => {
  if (!usuario.clienteId) return apiError('Sin acceso', 403);
  const docs = await prisma.documento.findMany({
    where: {
      deletedAt: null,
      visible: true,
      obra: { clienteId: usuario.clienteId },
    },
    include: { obra: { select: { codigo: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return apiOk(docs);
});
