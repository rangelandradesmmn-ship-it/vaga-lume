'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Utensils, Moon, Droplets } from 'lucide-react';

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<any>(null);

  useEffect(() => {
    fetchTimeline();
  }, []);

  async function fetchTimeline() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let childId = localStorage.getItem('vagalume_child_id');
    let childName = '';

    if (!childId) {
      // 1. Buscar qual criança está vinculada a este usuário (pai/mãe)
      const { data: guardianData } = await supabase
        .from('guardians')
        .select('child_id, children(name)')
        .eq('user_id', user?.id)
        .single();

      if (!guardianData) {
        setLoading(false);
        return;
      }
      childId = guardianData.child_id;
      childName = (Array.isArray(guardianData.children) ? (guardianData.children[0] as any)?.name : (guardianData.children as any)?.name) || '';
    } else {
      // Fetch child name since we only have the impersonated ID
      const { data: childData } = await supabase.from('children').select('name').eq('id', childId).single();
      if (childData) childName = childData.name;
    }

    setChild({ name: childName });

    // 2. Buscar registros do dia de hoje para esta criança
    const today = new Date().toISOString().split('T')[0];
    
    const [meals, sleep, bath] = await Promise.all([
      supabase.from('meals').select('*').eq('child_id', childId).eq('date', today),
      supabase.from('sleep_records').select('*').eq('child_id', childId).eq('date', today),
      supabase.from('bath_records').select('*').eq('child_id', childId).eq('date', today)
    ]);

    // 3. Juntar e ordenar por horário
    let events: any[] = [];
    
    if (meals.data) {
      meals.data.forEach(m => events.push({ ...m, eventType: 'meal', timeStr: m.time.substring(0,5) }));
    }
    if (sleep.data) {
      sleep.data.forEach(s => events.push({ ...s, eventType: 'sleep', timeStr: s.start_time.substring(0,5) }));
    }
    if (bath.data) {
      bath.data.forEach(b => events.push({ ...b, eventType: 'bath', timeStr: b.time.substring(0,5) }));
    }

    // Filtrar com base no parametro da URL
    const searchParams = new URLSearchParams(window.location.search);
    const filter = searchParams.get('filter');

    if (filter === 'meal') {
      events = events.filter(e => e.eventType === 'meal');
    } else if (filter === 'sleep') {
      events = events.filter(e => e.eventType === 'sleep');
    } else if (filter === 'bath') {
      events = events.filter(e => e.eventType === 'bath' && e.type === 'Banho');
    } else if (filter === 'diaper') {
      events = events.filter(e => e.eventType === 'bath' && e.type === 'Troca de Fralda');
    } else if (filter === 'hygiene') {
      // Tudo do bath_records que não for filtrado acima (ex: Troca de Roupa, Escovação)
      events = events.filter(e => e.eventType === 'bath');
    }

    // Ordenar do mais recente pro mais antigo
    events.sort((a, b) => b.timeStr.localeCompare(a.timeStr));

    setTimeline(events);
    setLoading(false);
  }

  const getIcon = (type: string) => {
    if (type === 'meal') return <Utensils size={20} className="text-vaga-yellow" />;
    if (type === 'sleep') return <Moon size={20} className="text-vaga-blue" />;
    if (type === 'bath') return <Droplets size={20} className="text-vaga-pink" />;
    return <Clock size={20} />;
  };

  const getColor = (type: string) => {
    if (type === 'meal') return 'bg-yellow-50 border-vaga-yellow/30';
    if (type === 'sleep') return 'bg-blue-50 border-vaga-blue/30';
    if (type === 'bath') return 'bg-pink-50 border-vaga-pink/30';
    return 'bg-gray-50 border-gray-200';
  };

  let title = "Rotina do Dia";
  let IconComponent = Clock;
  let iconColor = "text-vaga-blue";

  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const filter = searchParams.get('filter');
    if (filter === 'meal') { title = "Alimentação"; IconComponent = Utensils; iconColor = "text-vaga-yellow"; }
    else if (filter === 'sleep') { title = "Sono"; IconComponent = Moon; iconColor = "text-vaga-blue"; }
    else if (filter === 'bath') { title = "Banho"; IconComponent = Droplets; iconColor = "text-vaga-pink"; }
    else if (filter === 'diaper') { title = "Troca de Fralda"; IconComponent = Droplets; iconColor = "text-vaga-pink"; }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center gap-4 bg-white shadow-sm border-b border-gray-100 mb-6 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <IconComponent className={iconColor} size={20} />
            {title}
          </h2>
          <p className="text-sm font-semibold text-vaga-blue">{child ? child.name : 'Carregando...'}</p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        {loading ? (
          <p className="text-center text-gray-500 mt-10">Buscando informações do dia...</p>
        ) : !child ? (
          <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200 text-center">
            <h3 className="font-bold text-yellow-800 mb-2">Nenhuma criança vinculada</h3>
            <p className="text-sm text-yellow-700">A escola ainda não vinculou seu perfil ao do seu filho(a). Entre em contato com a secretaria.</p>
          </div>
        ) : timeline.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Nenhum registro ainda</h3>
            <p className="text-sm text-gray-500">A rotina de hoje ainda não começou a ser registrada pelas professoras.</p>
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {timeline.map((event, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Icon Marker */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  {getIcon(event.eventType)}
                </div>
                {/* Card */}
                <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border shadow-sm ${getColor(event.eventType)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-800">
                      {event.eventType === 'meal' && event.meal_type}
                      {event.eventType === 'sleep' && 'Soninho'}
                      {event.eventType === 'bath' && event.type}
                    </span>
                    <span className="text-xs font-bold px-2 py-1 bg-white rounded-lg text-gray-600 shadow-sm">
                      {event.timeStr}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-2">
                    {event.eventType === 'meal' && (
                      <>
                        <p><b>Oferecido:</b> {event.food_offered}</p>
                        <p><b>Aceitação:</b> {event.acceptance}</p>
                      </>
                    )}
                    {event.eventType === 'sleep' && (
                      <>
                        <p><b>Acordou:</b> {event.end_time ? event.end_time.substring(0,5) : 'Dormindo...'}</p>
                        <p><b>Qualidade:</b> {event.quality}</p>
                      </>
                    )}
                    {event.eventType === 'bath' && (
                      <p>Higiene realizada com sucesso.</p>
                    )}
                    
                    {event.notes && (
                      <p className="mt-2 text-xs italic opacity-80 bg-white/50 p-2 rounded-lg">"{event.notes}"</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
