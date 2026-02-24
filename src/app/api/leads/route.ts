// src/app/api/leads/route.ts
import { z } from 'zod';
import { withAuth, apiOk, parseBody } from '@/lib/api';
import * as crmService from '@/services/crm.service';

const leadSchema = z.object({
  nombre: z.string().min(2),
  apellidos: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  origen: z.enum(['WEB', 'RECOMENDACION', 'FERIA', 'PUERTA_FRIA', 'REPETIDOR', 'TELEFONO', 'OTRO']),
  tipo: z.enum(['RESIDENCIAL', 'INDUSTRIAL', 'AGROINDUSTRIAL', 'BATERIA', 'AEROTERMIA', 'BESS', 'BACKUP']),
  potenciaEstimada: z.number().positive().optional(),
  importeEstimado: z.number().int().optional(),
  notas: z.string().optional(),
});

export const GET = withAuth('crm:ver', async (req, { usuario }) => {
  const { searchParams } = new URL(req.url);
  const leads = await crmService.listarLeads({
    estado: searchParams.get('estado') || undefined,
    comercialId: usuario.rol === 'COMERCIAL' ? usuario.id : (searchParams.get('comercialId') || undefined),
    q: searchParams.get('q') || undefined,
  });
  return apiOk(leads);
});

export const POST = withAuth('crm:crear', async (req, { usuario }) => {
  const input = await parseBody(req, leadSchema);
  const lead = await crmService.crearLead(input, usuario.id);
  return apiOk(lead, 201);
});
