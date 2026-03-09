// GET /api/media/:entityType/:entityId — list media
// DELETE not here — see /api/media/[id]
import { withAuth, apiOk } from '@/lib/api';
import * as mediaService from '@/services/media.service';

export const dynamic = 'force-dynamic';

export const GET = withAuth('campo:checkin', async (req, { params }: any) => {
  const { entityType, entityId } = params;
  const files = await mediaService.listByEntity(entityType, entityId);
  return apiOk(files);
});
