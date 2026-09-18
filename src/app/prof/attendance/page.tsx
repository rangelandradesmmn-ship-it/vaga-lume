'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Fingerprint, Clock, Coffee, LogOut, LogIn } from 'lucide-react';

const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export default function ProfAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  const [scheduleStr, setScheduleStr] = useState<string>('');
  const [lunchDuration, setLunchDuration] = useState<number>(60);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [router]);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const today = new Date().toLocaleDateString('en-CA');

    // Fetch Profile/Schedule
    const { data: profData } = await supabase
      .from('professionals')
      .select('work_schedule, lunch_duration_minutes')
      .eq('id', user.id)
      .single();

      if (profData) {
        setLunchDuration(profData.lunch_duration_minutes || 60);
        let sched = profData.work_schedule;
        if (typeof sched === 'string') {
          try { sched = JSON.parse(sched); } catch (e) { }
        }
        
        if (sched && typeof sched === 'object' && !Array.isArray(sched)) {
          setScheduleStr(sched[today] || '');
        }
      }

    // Fetch today's attendance
    const { data: attData } = await supabase
      .from('professional_attendance')
      .select('*')
      .eq('professional_id', user.id)
      .eq('date', today)
      .single();

    if (attData) {
      setRecord(attData);
    }

    setLoading(false);
  }

  const handlePunch = async (field: 'entry_time' | 'lunch_start' | 'lunch_end' | 'exit_time') => {
    if (record && record[field]) return; // Already punched

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    const today = new Date().toLocaleDateString('en-CA');
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let upsertData: any = {
      professional_id: user.id,
      date: today,
      [field]: nowStr
    };

    const { data, error } = await supabase
      .from('professional_attendance')
      .upsert(upsertData, { onConflict: 'professional_id, date' })
      .select('*')
      .single();

    if (!error && data) {
      setRecord(data);
    } else if (error) {
      alert("Erro ao registrar ponto: " + error.message);
    }
    setLoading(false);
  };

  // Parsing logic for schedule colors
  const getExpectedTimes = () => {
    if (!scheduleStr || scheduleStr.toLowerCase().includes('folga')) return null;
    const matches = scheduleStr.match(/\d{1,2}/g);
    if (matches && matches.length >= 2) {
      return {
        startHour: parseInt(matches[0]),
        endHour: parseInt(matches[matches.length - 1])
      };
    }
    return null;
  };

  const getStatusColor = (field: string, val: string | null) => {
    if (!val) return 'bg-red-100 text-red-700 border-red-200'; // Empty
    
    // If it was edited by admin, always highlight yellow
    if (field === 'entry_time' && record?.is_edited_entry) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (field === 'lunch_start' && record?.is_edited_lunch_s) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (field === 'lunch_end' && record?.is_edited_lunch_e) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (field === 'exit_time' && record?.is_edited_exit) return 'bg-yellow-100 text-yellow-800 border-yellow-300';

    const expected = getExpectedTimes();
    if (!expected && scheduleStr.toLowerCase().includes('folga')) return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // Punched on a day off

    const [h, m] = val.split(':').map(Number);
    const timeInMins = h * 60 + m;

    if (field === 'entry_time' && expected) {
      const expStart = expected.startHour * 60;
      // Yellow if more than 15 mins late or 15 mins early
      if (Math.abs(timeInMins - expStart) > 15) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }

    if (field === 'exit_time' && expected) {
      const expEnd = expected.endHour * 60;
      if (timeInMins < expEnd - 15) return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // Left early
    }

    if (field === 'lunch_end' && record?.lunch_start) {
      const [sh, sm] = record.lunch_start.split(':').map(Number);
      const startInMins = sh * 60 + sm;
      const duration = timeInMins - startInMins;
      if (duration > lunchDuration + 10 || duration < lunchDuration - 10) return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // Lunch too long or too short
    }

    return 'bg-green-100 text-green-800 border-green-200'; // Correct
  };

  const renderPunchBlock = (title: string, field: 'entry_time' | 'lunch_start' | 'lunch_end' | 'exit_time', icon: any) => {
    const val = record?.[field];
    const colorClass = getStatusColor(field, val);
    const Icon = icon;

    return (
      <div className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${colorClass}`}>
        <Icon size={32} className="opacity-80" />
        <h3 className="font-bold uppercase tracking-wider text-xs opacity-90">{title}</h3>
        
        {val ? (
          <div className="text-3xl font-black">
            {val.substring(0, 5)}
          </div>
        ) : (
          <button 
            onClick={() => handlePunch(field)}
            disabled={loading}
            className="w-full bg-white/50 hover:bg-white/80 py-3 rounded-xl font-bold text-sm shadow-sm transition-colors"
          >
            Registrar
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm mb-6">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Fingerprint className="text-vaga-pink" /> Meu Ponto
        </h2>
        <div className="w-6" />
      </header>

      <main className="flex-1 w-full max-w-md px-6 flex flex-col">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Escala de Hoje</p>
          <p className="text-lg font-black text-gray-800">{scheduleStr || 'Não definida / Folga'}</p>
        </div>

        {loading && !record ? (
          <p className="text-center text-gray-500">Sincronizando relógio...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {renderPunchBlock('Entrada', 'entry_time', LogIn)}
            {renderPunchBlock('Ida Almoço', 'lunch_start', Coffee)}
            {renderPunchBlock('Volta Almoço', 'lunch_end', Clock)}
            {renderPunchBlock('Saída', 'exit_time', LogOut)}
          </div>
        )}

        <div className="mt-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h4 className="font-bold text-gray-700 text-sm mb-2">Legenda:</h4>
          <ul className="text-xs text-gray-600 flex flex-col gap-2">
            <li className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div> Horário pendente</li>
            <li className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-400"></div> Registrado corretamente</li>
            <li className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Divergência na escala ou editado pelo RH</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
