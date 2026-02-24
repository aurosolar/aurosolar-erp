// src/app/(campo)/campo/checkin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ObraCheckin {
  id: string;
  codigo: string;
  cliente: { nombre: string; apellidos: string };
  direccionInstalacion: string | null;
  localidad: string | null;
}

export default function CheckinPage() {
  const router = useRouter();
  const [obras, setObras] = useState<ObraCheckin[]>([]);
  const [obraId, setObraId] = useState<string>('');
  const [nota, setNota] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hora, setHora] = useState('');

  useEffect(() => {
    fetchObras();
  }, []);

  async function fetchObras() {
    try {
      const res = await fetch('/api/obras?limit=50');
      const data = await res.json();
      if (data.ok) {
        setObras(data.data.obras.filter((o: any) =>
          ['PROGRAMADA', 'INSTALANDO'].includes(o.estado)
        ));
      }
    } catch (err) { console.error(err); }
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  }

  async function handleCheckin() {
    if (!obraId) return;
    setLoading(true);

    try {
      const res = await fetch('/api/campo/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obraId,
          nota: nota || undefined,
          latitud: null, // TODO: navigator.geolocation
          longitud: null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setHora(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
        setDone(true);
      } else {
        alert(data.error || 'Error al registrar check-in');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  const obraSeleccionada = obras.find((o) => o.id === obraId);

  if (done) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-extrabold mb-2">Check-in registrado</h2>
        <p className="text-white/40 text-sm mb-1">
          Hora de llegada: <span className="font-bold text-white">{hora}</span>
        </p>
        {obraSeleccionada && (
          <p className="text-white/30 text-xs mb-6">{obraSeleccionada.codigo} · {obraSeleccionada.cliente.nombre}</p>
        )}
        <button
          onClick={() => router.push('/campo')}
          className="h-12 px-8 bg-[#F5820A] text-white font-bold rounded-[14px] text-sm active:scale-95 transition-transform"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-extrabold mb-1">📍 Check-in en obra</h2>
      <p className="text-sm text-white/40 mb-5">Registra tu llegada a la obra</p>

      {/* Seleccionar obra */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
          Seleccionar obra
        </label>
        <select
          value={obraId}
          onChange={(e) => setObraId(e.target.value)}
          className="w-full h-12 px-4 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm font-medium appearance-none focus:outline-none focus:border-[#F5820A]/40"
        >
          <option value="" className="bg-[#1A2E4A]">— Elige una obra —</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id} className="bg-[#1A2E4A]">
              {obra.codigo} · {obra.cliente.nombre} {obra.cliente.apellidos}
            </option>
          ))}
        </select>
      </div>

      {/* Info obra seleccionada */}
      {obraSeleccionada && (
        <div className="bg-white/[0.06] border border-white/[0.08] rounded-[10px] p-3 mb-4 flex items-center gap-3">
          <span className="text-xl">🏠</span>
          <div>
            <div className="text-[11px] font-bold text-[#F5820A]">{obraSeleccionada.codigo}</div>
            <div className="text-sm font-bold">{obraSeleccionada.cliente.nombre} {obraSeleccionada.cliente.apellidos}</div>
            {obraSeleccionada.direccionInstalacion && (
              <div className="text-xs text-white/35">📍 {obraSeleccionada.direccionInstalacion}, {obraSeleccionada.localidad}</div>
            )}
          </div>
        </div>
      )}

      {/* Foto de llegada */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
          📸 Foto de llegada <span className="text-white/15 font-normal normal-case tracking-normal">(opcional)</span>
        </label>
        {fotoPreview ? (
          <div className="relative w-full h-40 rounded-[14px] overflow-hidden mb-2">
            <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => { setFoto(null); setFotoPreview(''); }}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white text-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 bg-white/[0.04] border-2 border-dashed border-white/[0.08] rounded-[14px] cursor-pointer active:bg-white/[0.06]">
            <span className="text-3xl mb-1">📷</span>
            <span className="text-sm text-white/40 font-medium">Foto del acceso o fachada</span>
            <span className="text-[10px] text-white/20 mt-0.5">Toca para abrir cámara</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFoto}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Nota */}
      <div className="mb-6">
        <label className="block text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">
          📝 Nota de llegada <span className="text-white/15 font-normal normal-case tracking-normal">(opcional)</span>
        </label>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: Cliente no está, acceso por puerta trasera..."
          rows={2}
          className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-[14px] text-white text-sm placeholder-white/20 resize-none focus:outline-none focus:border-[#F5820A]/40"
        />
      </div>

      {/* Botón check-in */}
      <button
        onClick={handleCheckin}
        disabled={!obraId || loading}
        className="w-full h-14 bg-[#F5820A] text-white font-extrabold text-base rounded-[14px] flex items-center justify-center gap-2 shadow-lg shadow-[#F5820A]/30 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>📍 Registrar llegada</>
        )}
      </button>
    </div>
  );
}
