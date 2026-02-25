// src/app/(dashboard)/branding/page.tsx
'use client';
import { useState, useEffect, useRef } from 'react';

interface BrandingConfig {
  nombreEmpresa: string;
  subtitulo: string;
  colorPrimario: string;
  colorSecundario: string;
  colorFondo: string;
  colorTexto: string;
  temaOscuro: boolean;
  logoUrl: string | null;
  iconoUrl: string | null;
  faviconUrl: string | null;
}

const DEFAULT_CONFIG: BrandingConfig = {
  nombreEmpresa: 'Auro Solar',
  subtitulo: 'Energía · ERP',
  colorPrimario: '#F5820A',
  colorSecundario: '#1A2E4A',
  colorFondo: '#F2F5F9',
  colorTexto: '#1A2E4A',
  temaOscuro: false,
  logoUrl: null,
  iconoUrl: null,
  faviconUrl: null,
};

export default function BrandingPage() {
  const [config, setConfig] = useState<BrandingConfig>(DEFAULT_CONFIG);
  const [original, setOriginal] = useState<BrandingConfig>(DEFAULT_CONFIG);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);
  const iconoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/config-sistema')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data) {
          const branding = d.data.branding || {};
          const loaded = { ...DEFAULT_CONFIG, ...branding };
          setConfig(loaded);
          setOriginal(loaded);
        }
      })
      .catch(() => {});
  }, []);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(original);

  async function guardar() {
    setGuardando(true);
    setMensaje('');
    try {
      const res = await fetch('/api/config-sistema', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding: config }),
      });
      const d = await res.json();
      if (d.ok) {
        setOriginal(config);
        setMensaje('Guardado correctamente');
        setTimeout(() => setMensaje(''), 3000);
      } else {
        setMensaje('Error al guardar');
      }
    } catch {
      setMensaje('Error de conexión');
    }
    setGuardando(false);
  }

  function handleFile(field: 'logoUrl' | 'iconoUrl' | 'faviconUrl', file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMensaje('Archivo demasiado grande (máx 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setConfig({ ...config, [field]: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  }

  const set = (k: keyof BrandingConfig, v: any) => setConfig({ ...config, [k]: v });

  const inputCls = "w-full h-10 px-3 bg-auro-surface-2 border border-auro-border rounded-input text-sm text-auro-navy focus:outline-none focus:ring-2 focus:ring-auro-orange/30";
  const labelCls = "text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-1 block";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-auro-navy">Branding</h1>
          <p className="text-xs text-gray-400">Personaliza la apariencia de tu ERP</p>
        </div>
        <div className="flex items-center gap-3">
          {mensaje && (
            <span className={`text-xs font-medium ${mensaje.includes('Error') ? 'text-estado-red' : 'text-estado-green'}`}>{mensaje}</span>
          )}
          <button onClick={guardar} disabled={!hasChanges || guardando}
            className="px-4 py-2 bg-auro-orange hover:bg-auro-orange-dark text-white rounded-button text-sm font-semibold disabled:opacity-40 transition-colors">
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Identidad */}
      <div className="bg-white border border-auro-border rounded-card p-5">
        <h2 className="text-sm font-bold text-auro-navy mb-4">📝 Identidad</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre de empresa</label>
            <input value={config.nombreEmpresa} onChange={e => set('nombreEmpresa', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Subtítulo</label>
            <input value={config.subtitulo} onChange={e => set('subtitulo', e.target.value)} className={inputCls} placeholder="Ej: Energía · ERP" />
          </div>
        </div>
      </div>

      {/* Imágenes */}
      <div className="bg-white border border-auro-border rounded-card p-5">
        <h2 className="text-sm font-bold text-auro-navy mb-4">🖼️ Imágenes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Logo */}
          <div>
            <label className={labelCls}>Logo principal</label>
            <div className="border-2 border-dashed border-auro-border rounded-card p-4 text-center hover:border-auro-orange/40 transition-colors cursor-pointer"
              onClick={() => logoRef.current?.click()}>
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="h-16 mx-auto object-contain" />
              ) : (
                <div className="text-gray-400">
                  <div className="text-2xl mb-1">🖼️</div>
                  <div className="text-[10px]">Click para subir</div>
                </div>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile('logoUrl', e.target.files?.[0] || null)} />
            {config.logoUrl && (
              <button onClick={() => set('logoUrl', null)} className="text-[10px] text-estado-red mt-1 hover:underline">Eliminar logo</button>
            )}
          </div>

          {/* Icono app */}
          <div>
            <label className={labelCls}>Icono de app (PWA)</label>
            <div className="border-2 border-dashed border-auro-border rounded-card p-4 text-center hover:border-auro-orange/40 transition-colors cursor-pointer"
              onClick={() => iconoRef.current?.click()}>
              {config.iconoUrl ? (
                <img src={config.iconoUrl} alt="Icono" className="h-16 w-16 mx-auto object-contain rounded-xl" />
              ) : (
                <div className="text-gray-400">
                  <div className="text-2xl mb-1">📱</div>
                  <div className="text-[10px]">192x192 px</div>
                </div>
              )}
            </div>
            <input ref={iconoRef} type="file" accept="image/png" className="hidden" onChange={e => handleFile('iconoUrl', e.target.files?.[0] || null)} />
            {config.iconoUrl && (
              <button onClick={() => set('iconoUrl', null)} className="text-[10px] text-estado-red mt-1 hover:underline">Eliminar</button>
            )}
          </div>

          {/* Favicon */}
          <div>
            <label className={labelCls}>Favicon</label>
            <div className="border-2 border-dashed border-auro-border rounded-card p-4 text-center hover:border-auro-orange/40 transition-colors cursor-pointer"
              onClick={() => faviconRef.current?.click()}>
              {config.faviconUrl ? (
                <img src={config.faviconUrl} alt="Favicon" className="h-10 w-10 mx-auto object-contain" />
              ) : (
                <div className="text-gray-400">
                  <div className="text-2xl mb-1">⭐</div>
                  <div className="text-[10px]">32x32 px</div>
                </div>
              )}
            </div>
            <input ref={faviconRef} type="file" accept="image/png,image/x-icon" className="hidden" onChange={e => handleFile('faviconUrl', e.target.files?.[0] || null)} />
            {config.faviconUrl && (
              <button onClick={() => set('faviconUrl', null)} className="text-[10px] text-estado-red mt-1 hover:underline">Eliminar</button>
            )}
          </div>
        </div>
      </div>

      {/* Colores */}
      <div className="bg-white border border-auro-border rounded-card p-5">
        <h2 className="text-sm font-bold text-auro-navy mb-4">🎨 Colores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'colorPrimario' as const, label: 'Color primario', desc: 'Botones, acentos' },
            { key: 'colorSecundario' as const, label: 'Color secundario', desc: 'Sidebar, navbar' },
            { key: 'colorFondo' as const, label: 'Fondo', desc: 'Fondo general' },
            { key: 'colorTexto' as const, label: 'Texto', desc: 'Color de texto' },
          ].map(c2 => (
            <div key={c2.key}>
              <label className={labelCls}>{c2.label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config[c2.key]} onChange={e => set(c2.key, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-auro-border cursor-pointer" />
                <div>
                  <input value={config[c2.key]} onChange={e => set(c2.key, e.target.value)}
                    className="w-24 h-8 px-2 bg-auro-surface-2 border border-auro-border rounded text-xs text-auro-navy font-mono" />
                  <div className="text-[9px] text-gray-400 mt-0.5">{c2.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div className="bg-white border border-auro-border rounded-card p-5">
        <h2 className="text-sm font-bold text-auro-navy mb-4">🌗 Tema</h2>
        <div className="flex gap-3">
          <button onClick={() => set('temaOscuro', false)}
            className={`flex-1 p-4 rounded-card border-2 transition-all ${
              !config.temaOscuro ? 'border-auro-orange bg-auro-orange/5' : 'border-auro-border hover:border-auro-orange/30'
            }`}>
            <div className="text-2xl mb-2">☀️</div>
            <div className="text-sm font-semibold text-auro-navy">Tema claro</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Fondo claro, texto oscuro</div>
          </button>
          <button onClick={() => set('temaOscuro', true)}
            className={`flex-1 p-4 rounded-card border-2 transition-all ${
              config.temaOscuro ? 'border-auro-orange bg-auro-orange/5' : 'border-auro-border hover:border-auro-orange/30'
            }`}>
            <div className="text-2xl mb-2">🌙</div>
            <div className="text-sm font-semibold text-auro-navy">Tema oscuro</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Fondo oscuro, texto claro</div>
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white border border-auro-border rounded-card p-5">
        <h2 className="text-sm font-bold text-auro-navy mb-4">👁️ Vista previa</h2>
        <div className="rounded-xl overflow-hidden border border-auro-border">
          <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: config.colorSecundario }}>
            {config.iconoUrl ? (
              <img src={config.iconoUrl} alt="" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: config.colorPrimario }}>☀️</div>
            )}
            <div>
              <div className="text-white text-sm font-bold leading-tight">{config.nombreEmpresa}</div>
              <div className="text-white/40 text-[9px] uppercase tracking-wider">{config.subtitulo}</div>
            </div>
          </div>
          <div className="p-4" style={{ backgroundColor: config.colorFondo }}>
            <div className="flex gap-2 mb-3">
              <div className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold" style={{ backgroundColor: config.colorPrimario }}>Botón primario</div>
              <div className="px-3 py-1.5 rounded-lg border text-xs font-semibold" style={{ borderColor: config.colorPrimario, color: config.colorPrimario }}>Botón secundario</div>
            </div>
            <div className="bg-white rounded-lg p-3 border" style={{ borderColor: '#E0E5ED' }}>
              <div className="text-sm font-semibold" style={{ color: config.colorTexto }}>Ejemplo de tarjeta</div>
              <div className="text-xs mt-1" style={{ color: config.colorTexto, opacity: 0.6 }}>Este es el aspecto que tendrá tu ERP con los colores seleccionados.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Nota */}
      <div className="text-center text-[10px] text-gray-400 pb-4">
        Los cambios de tema se aplicarán en la próxima recarga de página. Los colores personalizados requieren rebuild para aplicarse completamente.
      </div>
    </div>
  );
}
