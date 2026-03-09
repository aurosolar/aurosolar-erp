// DELETE /api/media/delete/:id
import { withAuth, apiOk, apiError } from '@/lib/api';
import * as mediaService from '@/services/media.service';

export const dynamic = 'force-dynamic';

export const DELETE = withAuth('obras:ver', async (req, { usuario, params }: any) => {
  try {
    const { id } = params;
    await mediaService.softDelete(id, usuario.id);
    return apiOk({ deleted: true });
  } catch (e: any) {
    return apiError(e.message || 'Error al eliminar', 500);
  }
});
