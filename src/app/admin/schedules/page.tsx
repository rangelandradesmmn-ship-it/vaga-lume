'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar as CalendarIcon, Save, Printer, ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';

export default function AdminSchedulesPage() {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Week Navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);

  // Sub-schedule Modal
  const [showYearModal, setShowYearModal] = useState(false);
  const [selectedProf, setSelectedProf] = useState<any>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    updateWeekDays(currentDate);
    fetchProfessionals();
  }, []);

  const updateWeekDays = (date: Date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day); // Start on Sunday
    
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
      .select('id, name, professionals(role_title, class_name, work_schedule, lunch_duration_minutes)')
      .eq('role', 'PROFESSIONAL')
      .order('name');
      
    if (error) {
      console.error("Fetch error:", error);
      alert("Erro ao carregar profissionais: " + error.message);
    }
      
    if (data) {
      const formatted = data.map(p => {
        let schedule = Array.isArray(p.professionals) ? p.professionals[0]?.work_schedule : p.professionals?.work_schedule;
        let lunch_duration = Array.isArray(p.professionals) ? p.professionals[0]?.lunch_duration_minutes : p.professionals?.lunch_duration_minutes;
        
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
          class_name: Array.isArray(p.professionals) ? p.professionals[0]?.class_name : p.professionals?.class_name,
          schedule: parsed,
          lunch_duration: lunch_duration || 60
        };
      });
      setProfessionals(formatted);
    }
    setLoading(false);
  }

  const handleDateChange = (profId: string, dateStr: string, value: string) => {
    setProfessionals(professionals.map(p => {
      if (p.id === profId) {
        return { ...p, schedule: { ...p.schedule, [dateStr]: value } };
      }
      return p;
    }));
  };

  const handleLunchChange = (profId: string, value: string) => {
    setProfessionals(professionals.map(p => {
      if (p.id === profId) {
        return { ...p, lunch_duration: parseInt(value) || 0 };
      }
      return p;
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const promises = professionals.map(p => 
      supabase
        .from('professionals')
        .upsert({ 
          id: p.id, 
          work_schedule: p.schedule, 
          lunch_duration_minutes: p.lunch_duration,
          role_title: p.role_title || null,
          class_name: p.class_name || null
        })
    );
    await Promise.all(promises);
    setSaving(false);
    alert("Escalas salvas com sucesso!");
  };

  const handlePrint = () => window.print();

  // Helper formats
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

  // --- Sub-schedule features ---
  const openYearModal = (prof: any) => {
    setSelectedProf(prof);
    setShowYearModal(true);
  };

  const toggleDayStatus = (dateStr: string) => {
    if (!selectedProf) return;
    const current = selectedProf.schedule[dateStr] || '';
    let next = '';
    if (current === '') next = 'Folga';
    else if (current === 'Folga') next = 'Folga Extra';
    else if (current === 'Folga Extra') next = '';
    else next = 'Folga'; // If it has a typed time, clicking it changes to Folga

    setProfessionals(professionals.map(p => {
      if (p.id === selectedProf.id) {
        const updatedProf = { ...p, schedule: { ...p.schedule, [dateStr]: next } };
        setSelectedProf(updatedProf); // update local modal ref
        return updatedProf;
      }
      return p;
    }));
  };

  const renderMonth = (monthIndex: number) => {
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    const startDay = new Date(currentYear, monthIndex, 1).getDay();
    const monthName = new Date(currentYear, monthIndex, 1).toLocaleString('pt-BR', { month: 'long' });

    let blanks = Array(startDay).fill(null);
    let days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div key={monthIndex} className="bg-white border border-gray-100 rounded-xl p-3">
        <h4 className="text-center font-bold text-gray-800 capitalize mb-2">{monthName}</h4>
        <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-1 text-gray-400 font-bold">
          <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dateStr = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = selectedProf?.schedule[dateStr] || '';
            
            let colorClass = 'bg-gray-50 text-gray-600 hover:bg-gray-200'; // Trabalha / Normal
            if (status.toLowerCase() === 'folga') colorClass = 'bg-red-100 text-red-700 font-bold';
            else if (status.toLowerCase().includes('extra')) colorClass = 'bg-blue-100 text-blue-700 font-bold';
            else if (status.length > 0) colorClass = 'bg-green-100 text-green-700 font-bold'; // Has a time typed

            return (
              <button 
                key={day} 
                onClick={() => toggleDayStatus(dateStr)}
                title={status || 'Dia Normal (sem registro específico ou vazio)'}
                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] transition-colors ${colorClass}`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-7xl mx-auto print:bg-white print:p-0">
      
      {/* HEADER */}
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
            <Printer size={18} /> PDF
          </button>
          <button onClick={handleSaveAll} disabled={saving} className="bg-vaga-blue text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90 flex items-center gap-2 disabled:opacity-50">
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Tudo'}
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 print:hidden">
        <button onClick={handlePrevWeek} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-2 font-bold text-sm">
          <ChevronLeft size={18} /> Semana Anterior
        </button>
        <div className="flex flex-col items-center">
          <span className="text-lg font-black text-gray-800">
            {weekDays.length > 0 && `${weekDays[0].toLocaleDateString('pt-BR')} até ${weekDays[6].toLocaleDateString('pt-BR')}`}
          </span>
          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Mês Atual: {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        </div>
        <button onClick={handleNextWeek} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center gap-2 font-bold text-sm">
          Próxima Semana <ChevronRight size={18} />
        </button>
      </div>

      {/* PRINT HEADER */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Escala da Equipe</h1>
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
                <th className="p-4 font-bold text-gray-700 text-center w-24 print:hidden">Almoço</th>
                {weekDays.map(d => (
                  <th key={d.toISOString()} className="p-4 font-bold text-gray-700 text-center w-32 print:w-auto">
                    {getDayLabel(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {professionals.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-500">Nenhum profissional cadastrado.</td></tr>
              ) : (
                professionals.map((prof, idx) => (
                  <tr key={prof.id} className={idx !== professionals.length - 1 ? 'border-b border-gray-100 hover:bg-gray-50' : 'hover:bg-gray-50'}>
                    <td className="p-4 align-middle">
                      <div className="font-bold text-gray-800 leading-tight flex items-center justify-between">
                        {prof.name}
                        <button onClick={() => openYearModal(prof)} className="text-vaga-blue hover:bg-blue-50 p-1.5 rounded-md print:hidden" title="Ver Sub-escala Anual">
                          <CalendarDays size={16} />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1 print:hidden">{prof.role_title || 'Equipe'}</div>
                    </td>
                    <td className="p-2 align-middle print:hidden">
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          value={prof.lunch_duration}
                          onChange={(e) => handleLunchChange(prof.id, e.target.value)}
                          className="w-14 text-sm text-center border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-vaga-blue bg-white"
                        />
                        <span className="text-xs text-gray-400">m</span>
                      </div>
                    </td>
                    {weekDays.map(d => {
                      const dateStr = getFormatDateStr(d);
                      const val = prof.schedule[dateStr] || '';
                      
                      let inputColor = 'bg-white';
                      if (val.toLowerCase() === 'folga') inputColor = 'bg-red-50 text-red-700 font-bold';
                      else if (val.toLowerCase().includes('extra')) inputColor = 'bg-blue-50 text-blue-700 font-bold';

                      return (
                        <td key={dateStr} className="p-2 align-middle print:p-4 print:border print:border-gray-300">
                          {/* Interactive Input */}
                          <input 
                            type="text"
                            placeholder="Ex: 07h-13h"
                            value={val}
                            onChange={(e) => handleDateChange(prof.id, dateStr, e.target.value)}
                            className={`w-full text-sm text-center border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-vaga-blue print:hidden transition-colors ${inputColor}`}
                          />
                          {/* Static Text - Print */}
                          <div className="hidden print:block text-center text-sm font-medium text-gray-800">
                            {val || '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-SCHEDULE MODAL */}
      {showYearModal && selectedProf && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-50 rounded-3xl w-full max-w-4xl shadow-xl flex flex-col my-8">
            <div className="p-6 bg-white border-b border-gray-200 flex items-center justify-between rounded-t-3xl sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarDays className="text-vaga-blue" /> Sub-escala Anual
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Profissional: <strong className="text-vaga-blue">{selectedProf.name}</strong>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-100 p-2 rounded-lg">
                  <button onClick={() => setCurrentYear(currentYear - 1)} className="hover:text-vaga-blue p-1"><ChevronLeft size={16}/></button>
                  {currentYear}
                  <button onClick={() => setCurrentYear(currentYear + 1)} className="hover:text-vaga-blue p-1"><ChevronRight size={16}/></button>
                </div>
                <button onClick={() => setShowYearModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="mb-6 flex gap-4 text-xs font-bold text-gray-600 bg-white p-4 rounded-xl border border-gray-200">
                <span className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-100 rounded"></div> Dia Normal</span>
                <span className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 rounded"></div> Com Horário</span>
                <span className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 rounded"></div> Folga</span>
                <span className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-100 rounded"></div> Folga Extra</span>
                <span className="ml-auto text-gray-400 font-normal">Clique no dia para alternar</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => renderMonth(i))}
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-200 rounded-b-3xl">
              <p className="text-xs text-gray-400 text-center">
                Lembre-se de clicar em "Salvar Tudo" na tela principal para gravar permanentemente as alterações da sub-escala.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}} />
    </div>
  );
}
