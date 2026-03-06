// src/app/(campo)/campo/checkin/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ObraCheckin {
  id: string; codigo: string; tipo: string; estado: string;
  direccionInstalacion: string | null; localidad: string | null;
  potenciaKwp: number | null;
  cliente: { nombre: string; apellidos: string };
  checkinActivo: { id: string } | null;
}

async function compressImage(file: File, maxW = 1200, q = 0.8): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxW) { h = (h * maxW) / w; w = maxW; }
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      c.toBlob(b => resolve(b || file), 'image/jpeg', q);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function CheckinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preObraId = searchParams.get('obraId') || '';
  const [obras, setObras] = useState<ObraCheckin[]>([]);
  const [obraId, setObraId] = useState(preObraId);
  const [nota, setNota] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hora, setHora] = useState('');
  const [geoStatus, setGeoStatus] = useState<'idle'|'loading'|'ok'|'denied'|'error'>('idle');
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [yaActivo, setYaActivo] = useState(false);

  useEffect(() => {
    fetch('/api/campo/obras').then(r=>r.json()).then(d=>{
      if(d.ok) {
        setObras(d.data.filter((o:ObraCheckin)=>!o.checkinActivo&&['PROGRAMADA','INSTALANDO'].includes(o.estado)));
        if(preObraId){const e=d.data.find((o:ObraCheckin)=>o.id===preObraId);if(e?.checkinActivo)setYaActivo(true);}
      }
    });
    fetch('/api/campo/checkin/activo').then(r=>r.json()).then(d=>{if(d.ok&&d.data)setYaActivo(true);}).catch(()=>{});
  }, []);

  function requestGeo(){
    if(!navigator.geolocation){setGeoStatus('error');return;}
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      p=>{setCoords({lat:p.coords.latitude,lng:p.coords.longitude});setGeoStatus('ok');},
      e=>{setGeoStatus(e.code===1?'denied':'error');},
      {enableHighAccuracy:true,timeout:10000,maximumAge:0}
    );
  }

  async function handleCheckin(){
    if(!obraId||!foto)return;
    setLoading(true);
    if(geoStatus==='idle')requestGeo();
    try{
      const res=await fetch('/api/campo/checkin',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({obraId,nota:nota||undefined,latitud:coords?.lat??null,longitud:coords?.lng??null}),
      });
      const data=await res.json();
      if(data.ok){
        // Upload foto de llegada
        try{
          const compressed = await compressImage(foto);
          const fd=new FormData();
          fd.append('file',compressed,foto.name);
          fd.append('entityType','CHECKIN');
          fd.append('entityId',data.data.id);
          fd.append('obraId',obraId);
          fd.append('tipo','FOTO_GENERAL');
          await fetch('/api/media/upload',{method:'POST',body:fd});
        }catch{}
        setHora(new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));
        setDone(true);
      }else{alert(data.error||'Error al registrar check-in');}
    }catch{alert('Error de conexión');}
    finally{setLoading(false);}
  }

  const sel=obras.find(o=>o.id===obraId);

  if(yaActivo)return(
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">???</div>
      <h2 className="text-xl font-extrabold text-slate-800 mb-2">Ya tienes jornada activa</h2>
      <p className="text-slate-400 text-sm mb-6">Haz check-out antes de iniciar otro check-in.</p>
      <button onClick={()=>router.push('/campo')} className="h-11 px-8 bg-emerald-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform">Volver al inicio</button>
    </div>
  );

  if(done)return(
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">???</div>
      <h2 className="text-xl font-extrabold text-slate-800 mb-2">Check-in registrado</h2>
      <p className="text-slate-400 text-sm mb-1">Hora: <span className="font-bold text-slate-700">{hora}</span></p>
      {sel&&<p className="text-slate-400 text-xs mb-2">{sel.codigo} ?? {sel.cliente.nombre}</p>}
      {coords&&<p className="text-emerald-600 text-xs mb-4">📍 Ubicación registrada</p>}
      <button onClick={()=>router.push('/campo')} className="h-11 px-8 bg-emerald-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform">Volver al inicio</button>
    </div>
  );

  return(
    <div>
      <h2 className="text-lg font-extrabold text-slate-800 mb-1">📍 Check-in en obra</h2>
      <p className="text-sm text-slate-400 mb-5">Registra tu llegada a la obra</p>

      <div className="mb-4">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Seleccionar obra</label>
        <select value={obraId} onChange={e=>setObraId(e.target.value)}
          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
          <option value="">??? Elige una obra ???</option>
          {obras.map(o=><option key={o.id} value={o.id}>{o.codigo} ?? {o.cliente.nombre} {o.cliente.apellidos}</option>)}
        </select>
      </div>

      {sel&&(
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">🏠</div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-emerald-700">{sel.codigo}</p>
            <p className="text-sm font-bold text-slate-800">{sel.cliente.nombre} {sel.cliente.apellidos}</p>
            {sel.direccionInstalacion&&<p className="text-[10px] text-slate-400 truncate">📍 {sel.direccionInstalacion}{sel.localidad?`, ${sel.localidad}`:''}</p>}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">📍 Ubicación</label>
        {geoStatus==='idle'&&<button onClick={requestGeo} className="w-full h-10 bg-blue-50 border border-blue-200 text-blue-600 font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95">📍 Obtener ubicación</button>}
        {geoStatus==='loading'&&<div className="w-full h-10 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-2 text-sm text-blue-600"><div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"/>Obteniendo...</div>}
        {geoStatus==='ok'&&coords&&<div className="w-full h-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-sm text-emerald-700 font-medium">??? Ubicación obtenida</div>}
        {geoStatus==='denied'&&<div className="w-full h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-sm text-amber-700 font-medium">⚠️ Sin permiso de ubicación</div>}
        {geoStatus==='error'&&<div className="w-full h-10 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center text-sm text-red-600 font-medium">⚠️ Error al obtener ubicación</div>}
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">📸 Foto de llegada <span className="text-red-400">*</span></label>
        {fotoPreview?(
          <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
            <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover"/>
            <button onClick={()=>{setFoto(null);setFotoPreview('');}} className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full text-white text-xs flex items-center justify-center">???</button>
          </div>
        ):(
          <label className="flex flex-col items-center justify-center h-28 bg-white border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 active:bg-slate-50 transition-colors">
            <span className="text-3xl mb-1">📷</span>
            <span className="text-sm text-slate-400 font-medium">Foto del acceso o fachada</span>
            <span className="text-[10px] text-slate-300 mt-0.5">Obligatoria</span>
            <input type="file" accept="image/*" capture="environment" onChange={e=>{const f=e.target.files?.[0];if(f){setFoto(f);setFotoPreview(URL.createObjectURL(f));}}} className="hidden"/>
          </label>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">📝 Nota <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
        <textarea value={nota} onChange={e=>setNota(e.target.value)} placeholder="Ej: Cliente no est\u00e1, acceso por puerta trasera..."
          rows={2} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"/>
      </div>

      <button onClick={handleCheckin} disabled={!obraId||!foto||loading}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/25 transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2">
        {loading?<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<>📍 Registrar llegada</>}
      </button>
      {!foto&&obraId&&<p className="text-center text-[10px] text-red-400 mt-2 font-semibold">⚠️ La foto de llegada es obligatoria</p>}
    </div>
  );
}
