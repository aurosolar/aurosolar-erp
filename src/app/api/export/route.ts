// src/app/api/export/route.ts
import { NextResponse } from 'next/server';
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as exportService from '@/services/export.service';

export const GET = withAuth('config:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  let csv: string;
  let filename: string;

  switch (tipo) {
    case 'obras':
      csv = await exportService.exportarObrasCSV();
      filename = `obras_${new Date().toISOString().slice(0, 10)}.csv`;
      break;
    case 'clientes':
      csv = await exportService.exportarClientesCSV();
      filename = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
      break;
    case 'cobros':
      csv = await exportService.exportarCobrosCSV();
      filename = `cobros_${new Date().toISOString().slice(0, 10)}.csv`;
      break;
    default:
      return apiError('Tipo no válido: obras, clientes, cobros', 422);
  }

  // BOM for Excel compatibility
  const bom = '\uFEFF';
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
