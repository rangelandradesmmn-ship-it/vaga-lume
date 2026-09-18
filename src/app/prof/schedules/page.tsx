'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Calendar as CalendarIcon, Printer, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProfSchedulesPage() {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  useEffect(() => {
    updateWeekDays(currentDate);
    fetchProfessionals();
  }, []);

  const updateWeekDays = (date: Date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(start);
      nextDay.setDate(start.getDate() + i);
      days.push(nextDay);
    }
    setWeekDays(days);
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
    updateWeekDays(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
    updateWeekDays(newDate);
  };

  async function fetchProfessionals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, professionals(role_title, work_schedule)')
      .eq('role', 'PROFESSIONAL')
      .order('name');
      
    if (data) {
      const formatted = data.map(p => {
        let schedule = Array.isArray(p.professionals) ? p.professionals[0]?.work_schedule : p.professionals?.work_schedule;
        
        let parsed: any = {};
        if (typeof schedule === 'string') {
          try { schedule = JSON.parse(schedule); } catch (e) { schedule = null; }
        }

        if (schedule && typeof schedule === 'object' && !Array.isArray(schedule)) {
          parsed = { ...schedule };
        }

        return {
          id: p.id,
          name: p.name,
          role_title: Array.isArray(p.professionals) ? p.professionals[0]?.role_title : p.professionals?.role_title,
          schedule: parsed
        };
      });
      setProfessionals(formatted);
    }
    setLoading(false);
  }

  const handlePrint = () => window.print();

  const getFormatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDayLabel = (d: Date) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${days[d.getDay()]} ${day}/${m}`;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-7xl mx-auto print:bg-white print:p-0">
      
      <div className="flex items-center justify-between mb-8 border-b pb-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-vaga-blue">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon className="text-vaga-blue" />
            Quadro de Escalas
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 flex items-center gap-2">
            <Printer size={18} /> Salvar em PDF
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 print:hidden">
        <button onClick={handlePrevWeek} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-2 font-bold text-sm">
          <ChevronLeft size={18} /> Semana Anterior
        </button>
        <div className="flex flex-col items-center">
          <span className="text-lg font-black text-gray-800">
            {weekDays.length > 0 && `${weekDays[0].toLocaleDateString('pt-BR')} até ${weekDays[6].toLocaleDateString('pt-BR')}`}
          </span>
        </div>
        <button onClick={handleNextWeek} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-2 font-bold text-sm">
          Próxima Semana <ChevronRight size={18} />
        </button>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Escala de Trabalho - Equipe</h1>
        <p className="text-sm text-gray-500">Período: {weekDays.length > 0 && `${weekDays[0].toLocaleDateString('pt-BR')} até ${weekDays[6].toLocaleDateString('pt-BR')}`}</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-10 print:hidden">Carregando quadro de horários...</p>
      ) : (
        <div className="w-full overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200 print:shadow-none print:border-0 print:overflow-visible">
          <table className="w-full text-left min-w-[900px] print:min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 print:bg-gray-100">
                <th className="p-4 font-bold text-gray-700 min-w-[200px]">Profissional</th>
                {weekDays.map(d => (
                  <th key={d.toISOString()} className="p-4 font-bold text-gray-700 text-center w-28 print:w-auto">
                    {getDayLabel(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {professionals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">Nenhum profissional cadastrado.</td>
                </tr>
              ) : (
                professionals.map((prof, idx) => (
                  <tr key={prof.id} className={idx !== professionals.length - 1 ? 'border-b border-gray-100' : ''}>
                    <td className="p-4 align-middle">
                      <div className="font-bold text-gray-800 leading-tight">{prof.name}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{prof.role_title || 'Equipe'}</div>
                    </td>
                    {weekDays.map(d => {
                      const dateStr = getFormatDateStr(d);
                      const val = prof.schedule[dateStr] || '';
                      
                      let color = 'text-gray-800';
                      let bg = '';
                      if (val.toLowerCase() === 'folga') { color = 'text-red-700'; bg = 'bg-red-50'; }
                      else if (val.toLowerCase().includes('extra')) { color = 'text-blue-700'; bg = 'bg-blue-50'; }

                      return (
                        <td key={dateStr} className={`p-4 align-middle text-center print:border print:border-gray-300 ${bg}`}>
                          <div className={`text-sm font-bold ${color}`}>
                            {val || '-'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}} />
    </div>
  );
}
