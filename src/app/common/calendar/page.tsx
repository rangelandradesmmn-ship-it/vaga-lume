'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newAlertBefore, setNewAlertBefore] = useState('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  async function fetchEvents() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user?.id)
      .gte('date', start)
      .lte('date', end)
      .order('event_time', { ascending: true, nullsFirst: true });
      
    if (data) setEvents(data);
    setLoading(false);
  }

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    setShowModal(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !newEventTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    const { error } = await supabase.from('calendar_events').insert({
      date: dateStr,
      title: newEventTitle,
      user_id: user?.id,
      event_time: newEventTime || null,
      alert_before: newAlertBefore
    });

    if (error) alert("Erro ao salvar: " + error.message);
    else {
      setNewEventTitle('');
      setNewEventTime('');
      setNewAlertBefore('none');
      fetchEvents();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (!error) fetchEvents();
  };

  const getSelectedDateStr = () => {
    if (!selectedDate) return '';
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  };

  const dayEvents = events.filter(e => e.date === getSelectedDateStr());
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const formatAlert = (alert: string) => {
    if (alert === '5m') return '🔔 5 min antes';
    if (alert === '30m') return '🔔 30 min antes';
    if (alert === '1d') return '🔔 1 dia antes';
    return '';
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center justify-between bg-white shadow-sm border-b border-gray-100 mb-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-vaga-pink">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CalendarIcon className="text-vaga-yellow" size={20} />
              Meu Calendário
            </h2>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          
          <div className="flex items-center justify-between mb-6">
            <button onClick={handlePrevMonth} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h3 className="font-bold text-lg text-gray-800 capitalize">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button onClick={handleNextMonth} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100">
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-xs font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hasEvent = events.some(e => e.date === dateStr);
              
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`
                    aspect-square flex flex-col items-center justify-center rounded-xl relative
                    hover:bg-yellow-50 transition-colors
                    ${isToday ? 'bg-vaga-yellow/20 font-bold text-vaga-yellow border border-vaga-yellow' : 'text-gray-700 font-semibold'}
                  `}
                >
                  {day}
                  {hasEvent && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-vaga-pink"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {showModal && selectedDate && (
          <div className="mt-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-in slide-in-from-bottom-4">
            <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
              <span>{selectedDate.toLocaleDateString('pt-BR')}</span>
              <button onClick={() => setShowModal(false)} className="text-sm font-normal text-gray-400 hover:text-gray-600">Fechar</button>
            </h3>

            {dayEvents.length > 0 ? (
              <div className="space-y-3 mb-6">
                {dayEvents.map(ev => (
                  <div key={ev.id} className="flex flex-col bg-yellow-50 p-3 rounded-xl border border-yellow-100 relative">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-800 font-bold">{ev.title}</span>
                      <button onClick={() => handleDelete(ev.id)} className="text-red-400 hover:text-red-600 p-1 -mt-1 -mr-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {ev.event_time && (
                      <span className="text-xs text-gray-600 font-medium mt-1">🕒 {ev.event_time.substring(0,5)}</span>
                    )}
                    {ev.alert_before !== 'none' && (
                      <span className="text-xs text-vaga-pink font-bold mt-0.5">{formatAlert(ev.alert_before)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-6 text-center">Nenhum lembrete para este dia.</p>
            )}

            <form onSubmit={handleAddEvent} className="flex flex-col gap-3">
              <input 
                type="text" 
                value={newEventTitle} 
                onChange={e => setNewEventTitle(e.target.value)}
                placeholder="Título do lembrete..."
                className="w-full p-3 border border-vaga-gray rounded-xl focus:ring-vaga-yellow outline-none text-sm font-medium"
                required
              />
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Horário</label>
                  <input 
                    type="time" 
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    className="w-full p-3 border border-vaga-gray rounded-xl focus:ring-vaga-yellow outline-none text-sm"
                  />
                </div>
                
                <div className="flex-[2]">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Despertador</label>
                  <select 
                    value={newAlertBefore}
                    onChange={e => setNewAlertBefore(e.target.value)}
                    className="w-full p-3 border border-vaga-gray rounded-xl focus:ring-vaga-yellow outline-none text-sm bg-white"
                  >
                    <option value="none">Sem alarme</option>
                    <option value="5m">5 minutos antes</option>
                    <option value="30m">30 minutos antes</option>
                    <option value="1d">1 dia antes</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="bg-vaga-yellow text-gray-800 font-bold p-3 rounded-xl hover:opacity-90 mt-1 flex justify-center items-center gap-2">
                <Plus size={18} /> Adicionar
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
