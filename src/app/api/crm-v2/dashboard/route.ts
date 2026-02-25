import { withAuth, apiOk } from '@/lib/api';
import * as crm from '@/services/crm-v2.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('crm:ver', async (req, { usuario }) => {
  if (usuario.rol === 'COMERCIAL') {
    const data = await crm.dashboardComercial(usuario.id);
    return apiOk({ tipo: 'comercial', data });
  }
  const [kpis, ranking] = await Promise.all([
    crm.kpisGeneralesCRM(),
    crm.rankingComerciales(),
  ]);
  return apiOk({ tipo: 'direccion', data: { kpis, ranking } });
});
