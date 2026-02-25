// src/app/api/portal/pagos/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withAuth('portal:ver', async (req, { usuario }) => {
  if (!usuario.clienteId) return apiError('Sin acceso', 403);
  const pagos = await prisma.pago.findMany({
    where: { obra: { clienteId: usuario.clienteId } },
    include: { obra: { select: { codigo: true } } },
    orderBy: { fechaCobro: 'desc' },
  });
  return apiOk(pagos);
});
