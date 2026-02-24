// src/app/api/dashboard/route.ts
import { withAuth, apiOk } from '@/lib/api';
import * as dashboardService from '@/services/dashboard.service';

export const GET = withAuth('dashboard:ver', async () => {
  const [kpis, alertas, grafico, incidencias, contadores] = await Promise.all([
    dashboardService.obtenerKPIs(),
    dashboardService.obtenerAlertasDashboard(),
    dashboardService.graficoFacturacion(),
    dashboardService.incidenciasAbiertas(),
    dashboardService.contadoresPorEstado(),
  ]);

  return apiOk({ kpis, alertas, grafico, incidencias, contadores });
});
