// src/app/api/documentos/route.ts
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as docService from '@/services/documentos.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('obras:ver', async (req) => {
  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obraId') || undefined;
  const tipo = searchParams.get('tipo') || undefined;
  const docs = await docService.listar({ obraId, tipo });
  return apiOk(docs);
});

export const POST = withAuth('obras:ver', async (req, { usuario }) => {
  try {
    const formData = await req.formData();
    const file = formData.get('archivo') as File | null;
    const obraId = formData.get('obraId') as string;
    const tipo = formData.get('tipo') as string;
    const descripcion = formData.get('descripcion') as string | null;
    const visible = formData.get('visible') === 'true';

    if (!file || !obraId || !tipo) {
      return apiError('Faltan campos: archivo, obraId, tipo', 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await docService.subir({
      obraId,
      tipo,
      nombre: file.name,
      descripcion: descripcion || undefined,
      data: buffer,
      mimeType: file.type,
      visible,
    }, usuario.id);

    return apiOk(doc, 201);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Error al subir', 500);
  }
});
