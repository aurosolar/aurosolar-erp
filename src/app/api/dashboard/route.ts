// src/app/api/dashboard/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as dashboardService from '@/services/dashboard.service';

export const GET = withAuth('dashboard:ver', async () => {
  const [kpis, alertas, grafico, incidencias, contadores, actividad, ranking] = await Promise.all([
    dashboardService.obtenerKPIs(),
    dashboardService.obtenerAlertasDashboard(),
    dashboardService.graficoFacturacion(),
    dashboardService.incidenciasAbiertas(),
    dashboardService.contadoresPorEstado(),
    dashboardService.actividadReciente(),
    dashboardService.rankingComerciales(),
  ]);

  return apiOk({ kpis, alertas, grafico, incidencias, contadores, actividad, ranking });
});
