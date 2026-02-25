// src/app/api/tareas-crm/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import * as crmV2 from '@/services/crm-v2.service';

export const GET = withAuth('tareas-crm:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const userId = usuario.rol === 'COMERCIAL' ? usuario.id : (searchParams.get('asignadoId') || usuario.id);
  const filtros = {
    estado: searchParams.get('estado') || undefined,
    tipo: searchParams.get('tipo') || undefined,
  };
  const tareas = await crmV2.listarTareas({ asignadoId: userId, estado: filtros.estado });
  return apiOk(tareas);
});

const crearSchema = z.object({
  contactoId: z.string().uuid().optional(),
  tipo: z.enum(['LLAMADA', 'EMAIL', 'REUNION', 'VISITA', 'PRESUPUESTO', 'SEGUIMIENTO', 'OTRO']),
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  prioridad: z.enum(['ALTA', 'MEDIA', 'BAJA']).optional(),
  asignadoId: z.string().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
});

export const POST = withAuth('tareas-crm:crear', async (req, { usuario }) => {
  const data = await parseBody(req, crearSchema);
  const tarea = await crmV2.crearTarea(
    {
      ...data,
      asignadoId: data.asignadoId && data.asignadoId !== 'self' ? data.asignadoId : usuario.id,
    },
    usuario.id
  );
  return apiOk(tarea);
});
