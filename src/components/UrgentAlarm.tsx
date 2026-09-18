'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

export default function UrgentAlarm() {
  const [isAlarming, setIsAlarming] = useState(false);
  const pathname = usePathname();
  const workerRef = useRef<Worker | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Inicializar o AudioContext em uma variável de referência para mantê-lo destravado
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Criar o Web Worker em Blob
    const workerCode = `
      let pollInterval;
      let beepInterval;

      self.onmessage = function(e) {
        if (e.data === 'startPoll') {
          pollInterval = setInterval(() => self.postMessage('poll'), 3000);
        } else if (e.data === 'stopPoll') {
          clearInterval(pollInterval);
        } else if (e.data === 'startBeep') {
          // Send beep immediately, then every 2s
          self.postMessage('beep');
          beepInterval = setInterval(() => self.postMessage('beep'), 2000);
        } else if (e.data === 'stopBeep') {
          clearInterval(beepInterval);
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    const checkUrgency = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: urgentMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('is_urgent', true)
        .neq('sender_id', user.id)
        .limit(1);

      if (urgentMessages && urgentMessages.length > 0) {
        setIsAlarming(true);
      } else {
        setIsAlarming(false);
      }
    };

    const playNextelChirp = async () => {
      try {
        const audioCtx = audioCtxRef.current;
        if (!audioCtx) return;

        // Force resume if suspended by background tab
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'square';
        
        oscillator.frequency.setValueAtTime(1800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // LOUD!
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
        
        oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + 0.25);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        console.error("Audio block", e);
      }
    };

    worker.onmessage = (e) => {
      if (e.data === 'poll') {
        checkUrgency();
      } else if (e.data === 'beep') {
        playNextelChirp();
      }
    };

    // Iniciar polling
    checkUrgency();
    worker.postMessage('startPoll');

    return () => {
      worker.postMessage('stopPoll');
      worker.postMessage('stopBeep');
      worker.terminate();
    };
  }, [pathname]);

  useEffect(() => {
    if (isAlarming) {
      // Usar a Notification API para dar um aviso nativo no celular, que sempre toca
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("ALERTA DE URGÊNCIA!", {
          body: "Você tem uma mensagem urgente no Vaga-lume. Abra o app para responder.",
          requireInteraction: true,
          silent: false
        });
      }
      workerRef.current?.postMessage('startBeep');
    } else {
      workerRef.current?.postMessage('stopBeep');
    }
  }, [isAlarming]);

  const stopAlarm = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase
        .from('messages')
        .update({ is_urgent: false })
        .eq('is_urgent', true)
        .neq('sender_id', user.id);
        
      setIsAlarming(false);
      workerRef.current?.postMessage('stopBeep');
    } catch (err) {
      console.error(err);
    }
  };

  // Pedir permissão de notificação nativa ao montar (silenciosamente)
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    
    // Iniciar áudio silencioso no primeiro clique na tela para manter o app vivo no background
    const initSilentAudio = () => {
      const audio = document.getElementById('silent-keepawake') as HTMLAudioElement;
      if (audio) {
        audio.play().catch(e => console.log('Audio init blocked', e));
      }
      document.removeEventListener('click', initSilentAudio);
      document.removeEventListener('touchstart', initSilentAudio);
    };
    
    document.addEventListener('click', initSilentAudio);
    document.addEventListener('touchstart', initSilentAudio);
    
    return () => {
      document.removeEventListener('click', initSilentAudio);
      document.removeEventListener('touchstart', initSilentAudio);
    };
  }, []);

  return (
    <>
      <audio 
        id="silent-keepawake" 
        src="data:audio/wav;base64,UklGRmYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTwAAAAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA=" 
        loop 
        playsInline 
        style={{ display: 'none' }} 
      />
      {isAlarming && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white p-4 z-[9999] text-center font-bold shadow-lg flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="animate-pulse flex items-center gap-2">
            🚨 VOCÊ TEM UMA MENSAGEM URGENTE NO CHAT. 🚨
          </div>
          <button 
            onClick={stopAlarm}
            className="bg-white text-red-600 px-6 py-2 rounded-full font-black text-sm uppercase shadow-sm hover:bg-red-50 hover:scale-105 transition-all"
          >
            Desligar Alarme
          </button>
        </div>
      )}
    </>
  );
}
