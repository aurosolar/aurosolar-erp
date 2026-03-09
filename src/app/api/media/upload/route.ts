// POST /api/media/upload
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as mediaService from '@/services/media.service';

export const dynamic = 'force-dynamic';

export const POST = withAuth('campo:checkin', async (req, { usuario }) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const obraId = formData.get('obraId') as string | null;
    const tipo = formData.get('tipo') as string | null;

    if (!file || !entityType || !entityId) {
      return apiError('Faltan campos: file, entityType, entityId', 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const doc = await mediaService.upload({
      file: buffer,
      fileName: file.name,
      mimeType: file.type,
      entityType,
      entityId,
      obraId: obraId || undefined,
      tipo: tipo || undefined,
    }, usuario.id);

    return apiOk(doc, 201);
  } catch (e: any) {
    return apiError(e.message || 'Error al subir archivo', 500);
  }
});
