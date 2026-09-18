'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ListOrdered, Calendar as CalendarIcon, Clock, Utensils, Moon, Droplets, Palette, Baby, Columns, User } from 'lucide-react';

export default function ConsolidationPage() {
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState('');
  const [groupedData, setGroupedData] = useState<any>({});
  
  const router = useRouter();

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    setTargetDate(today);
  }, []);

  useEffect(() => {
    if (targetDate) {
      fetchConsolidationData(targetDate);
    }
  }, [targetDate]);

  async function fetchConsolidationData(date: string) {
    setLoading(true);

    const promises = [
      supabase.from('meals').select('time, meal_type, professional_id, children(name)').eq('date', date),
      supabase.from('sleep_records').select('start_time, end_time, professional_id, children(name)').eq('date', date),
      supabase.from('bath_records').select('time, bath_type, professional_id, children(name)').eq('date', date),
      supabase.from('child_attendance').select('entry_time, exit_time, professional_id, children(name)').eq('date', date),
      supabase.from('child_activities').select('did_activity, created_at, professional_id, children(name)').eq('date', date),
      supabase.from('pillars_evaluations').select('created_at, professional_id, children(name)')
    ];

    const results = await Promise.all(promises);
    
    let allEvents: any[] = [];

    // Meals
    results[0].data?.forEach(r => {
      if (!r.professional_id) return;
      const childName = Array.isArray(r.children) ? r.children[0]?.name : r.children?.name;
      allEvents.push({ prof_id: r.professional_id, time: r.time, type: 'Alimentação', desc: `${r.meal_type} de ${childName}`, icon: Utensils, color: 'text-vaga-yellow' });
    });

    // Sleep
    results[1].data?.forEach(r => {
      if (!r.professional_id) return;
      const childName = Array.isArray(r.children) ? r.children[0]?.name : r.children?.name;
      allEvents.push({ prof_id: r.professional_id, time: r.start_time, type: 'Sono', desc: `Registro de sono para ${childName}`, icon: Moon, color: 'text-vaga-blue' });
    });

    // Bath
    results[2].data?.forEach(r => {
      if (!r.professional_id) return;
      const childName = Array.isArray(r.children) ? r.children[0]?.name : r.children?.name;
      const typeStr = r.bath_type === 'bath' ? 'Banho' : 'Fralda';
      allEvents.push({ prof_id: r.professional_id, time: r.time, type: typeStr, desc: `Registro de ${typeStr} para ${childName}`, icon: r.bath_type === 'bath' ? Droplets : Baby, color: 'text-vaga-pink' });
    });

    // Attendance
    results[3].data?.forEach(r => {
      if (!r.professional_id) return;
      const childName = Array.isArray(r.children) ? r.children[0]?.name : r.children?.name;
      if (r.entry_time) allEvents.push({ prof_id: r.professional_id, time: r.entry_time, type: 'Entrada', desc: `Registrou entrada de ${childName}`, icon: Clock, color: 'text-green-500' });
      if (r.exit_time) allEvents.push({ prof_id: r.professional_id, time: r.exit_time, type: 'Saída', desc: `Registrou saída de ${childName}`, icon: Clock, color: 'text-red-500' });
    });

    // Activities
    results[4].data?.forEach(r => {
      if (!r.professional_id) return;
      const childName = Array.isArray(r.children) ? r.children[0]?.name : r.children?.name;
      const timeStr = new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
      const status = r.did_activity ? 'fez' : 'não fez';
      allEvents.push({ prof_id: r.professional_id, time: timeStr, type: 'Atividade', desc: `Registrou que ${childName} ${status} atividade`, icon: Palette, color: 'text-vaga-yellow' });
    });

    // Pillars (we need to filter date manually because they use created_at)
    results[5].data?.forEach(r => {
      if (!r.professional_id) return;
      const d = new Date(r.created_at);
      const rowDate = d.toLocaleDateString('en-CA');
      if (rowDate === date) {
        const childName = Array.isArray(r.children) ? r.children[0]?.name : r.children?.name;
        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        allEvents.push({ prof_id: r.professional_id, time: timeStr, type: 'Pilares', desc: `Avaliação de pilares para ${childName}`, icon: Columns, color: 'text-vaga-blue' });
      }
    });

    // Get profiles for those prof_ids
    const profIds = Array.from(new Set(allEvents.map(e => e.prof_id)));
    let profMap: any = {};
    if (profIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, name, role').in('id', profIds);
      profilesData?.forEach(p => {
        profMap[p.id] = p;
      });
    }

    // Group by prof_id
    let grouped: any = {};
    allEvents.forEach(e => {
      const p = profMap[e.prof_id];
      if (!p) return; // if profile deleted
      
      if (!grouped[e.prof_id]) {
        grouped[e.prof_id] = {
          profile: p,
          events: []
        };
      }
      grouped[e.prof_id].events.push(e);
    });

    // Sort events by time
    Object.keys(grouped).forEach(k => {
      grouped[k].events.sort((a: any, b: any) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
    });

    setGroupedData(grouped);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6 border-b pb-4">
        <Link href="/" className="text-gray-500 hover:text-vaga-yellow">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ListOrdered className="text-vaga-yellow" />
          Consolidação Diária
        </h1>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-3 rounded-full text-vaga-blue">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Selecione o Dia</h3>
            <p className="text-sm text-gray-500">Veja todos os registros da equipe</p>
          </div>
        </div>
        <input 
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          className="border border-gray-200 rounded-xl p-3 font-bold text-gray-700 bg-gray-50 focus:bg-white"
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-10">Levantando os registros...</p>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
          Nenhum registro encontrado para esta data.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.values(groupedData).map((group: any) => (
            <div key={group.profile.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 text-gray-400">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{group.profile.name}</h3>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{group.profile.role === 'ADMIN' ? 'Administrador' : 'Profissional'}</p>
                </div>
                <div className="ml-auto">
                  <span className="bg-white text-gray-600 font-bold text-xs px-3 py-1 rounded-full border border-gray-200">
                    {group.events.length} Lançamentos
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-3">
                {group.events.map((ev: any, idx: number) => {
                  const Icon = ev.icon;
                  return (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-gray-400 w-12 text-right">{ev.time ? ev.time.substring(0,5) : '--:--'}</span>
                      </div>
                      <div className="relative pt-1">
                        <div className={`absolute top-2 left-[-16px] w-2 h-2 rounded-full bg-gray-300`}></div>
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white shadow-sm border border-gray-100 ${ev.color}`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-800 font-medium">{ev.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
