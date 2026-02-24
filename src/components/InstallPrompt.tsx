// src/components/InstallPrompt.tsx
'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // iOS detection
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Android/Chrome prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show after 30 seconds
    if (ios) {
      const timer = setTimeout(() => setShow(true), 30000);
      return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler); };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
    }
  }

  function dismiss() {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[200] sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm animate-slide-up">
      <div className="bg-auro-navy rounded-2xl p-4 shadow-2xl border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-auro-orange flex items-center justify-center text-xl shrink-0 shadow-lg shadow-auro-orange/30">
            ☀️
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white text-sm font-bold mb-0.5">Instalar Auro Solar</h4>
            <p className="text-white/50 text-xs leading-relaxed">
              {isIOS
                ? 'Pulsa el icono de compartir ↗ y "Añadir a pantalla de inicio"'
                : 'Añade la app a tu pantalla de inicio para acceso rápido'}
            </p>
          </div>
          <button onClick={dismiss} className="text-white/30 text-lg hover:text-white/60 -mt-1">✕</button>
        </div>
        {!isIOS && (
          <button onClick={install}
            className="w-full mt-3 h-10 bg-auro-orange hover:bg-auro-orange-dark text-white text-sm font-bold rounded-xl transition-colors">
            📲 Instalar ahora
          </button>
        )}
      </div>
    </div>
  );
}
