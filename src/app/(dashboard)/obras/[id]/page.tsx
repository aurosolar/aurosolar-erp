// src/app/(dashboard)/obras/[id]/page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ObraDetalle } from '@/components/obras/ObraDetalle';

export default function ObraPage() {
  const params = useParams();
  const router = useRouter();
  const obraId = params.id as string;

  return (
    <div className="-m-4 lg:-m-6 min-h-[calc(100vh-3.5rem)]">
      <ObraDetalle
        obraId={obraId}
        onClose={() => router.push('/obras')}
        onUpdate={() => {}}
      />
    </div>
  );
}
