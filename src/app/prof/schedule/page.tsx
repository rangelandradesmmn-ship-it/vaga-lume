'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Search } from 'lucide-react';

export default function ProfSchedulePage() {
  const [children, setChildren] = useState<any[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Attendance modal states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedChildForAttendance, setSelectedChildForAttendance] = useState<any>(null);
  const [attendanceDate, setAttendanceDate] = useState('');
  const [attendanceData, setAttendanceData] = useState({ entry_time: '', exit_time: '' });
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredChildren(children);
    } else {
      setFilteredChildren(children.filter(c => c.name.toLowerCase().includes(search.toLowerCase())));
    }
  }, [search, children]);

  async function fetchChildren() {
    setLoading(true);
    const { data } = await supabase
      .from('children')
      .select('*')
      .order('name');
      
    if (data) {
      setChildren(data);
      setFilteredChildren(data);
    }
    setLoading(false);
  }

  const openAttendanceModal = async (child: any) => {
    setSelectedChildForAttendance(child);
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    setAttendanceDate(today);
    setShowAttendanceModal(true);
    await loadAttendance(child.id, today);
  };

  const loadAttendance = async (childId: string, date: string) => {
    setLoadingAttendance(true);
    const { data } = await supabase
      .from('child_attendance')
      .select('entry_time, exit_time')
      .eq('child_id', childId)
      .eq('date', date)
      .single();
    
    if (data) {
      setAttendanceData({ entry_time: data.entry_time || '', exit_time: data.exit_time || '' });
    } else {
      setAttendanceData({ entry_time: '', exit_time: '' });
    }
    setLoadingAttendance(false);
  };

  const handleAttendanceDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setAttendanceDate(newDate);
    if (selectedChildForAttendance) {
      await loadAttendance(selectedChildForAttendance.id, newDate);
    }
  };

  const setTimeNow = (field: 'entry_time' | 'exit_time') => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setAttendanceData(prev => ({ ...prev, [field]: timeString }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedChildForAttendance) return;
    setLoadingAttendance(true);

    const { data: { user } } = await supabase.auth.getUser();

    const upsertData = {
      child_id: selectedChildForAttendance.id,
      date: attendanceDate,
      entry_time: attendanceData.entry_time || null,
      exit_time: attendanceData.exit_time || null,
      professional_id: user?.id || null
    };

    const { error } = await supabase
      .from('child_attendance')
      .upsert(upsertData, { onConflict: 'child_id, date' });

    setLoadingAttendance(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setShowAttendanceModal(false);
      alert("Ponto salvo com sucesso!");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 bg-white shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-gray-500 hover:text-vaga-blue">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="text-vaga-blue" />
          Horário
        </h2>
        <div className="w-6" /> {/* Spacer */}
      </header>

      <main className="flex-1 w-full max-w-md p-4">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-vaga-blue focus:border-transparent text-sm"
            placeholder="Buscar criança..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Carregando crianças...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredChildren.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
                Nenhuma criança encontrada.
              </div>
            ) : (
              filteredChildren.map(child => (
                <div key={child.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{child.name}</span>
                    <span className="text-xs text-gray-500">Turma: {child.class_name || 'N/A'}</span>
                  </div>
                  <button 
                    onClick={() => openAttendanceModal(child)}
                    className="bg-vaga-blue text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-sm shrink-0"
                  >
                    <Clock size={16} /> Bater Ponto
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal Ponto */}
      {showAttendanceModal && selectedChildForAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Clock className="text-vaga-blue" />
              Ponto Diário
            </h2>
            <p className="text-gray-500 text-sm mb-6">Registrando para: <strong>{selectedChildForAttendance.name}</strong></p>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Data</label>
                <input 
                  type="date" 
                  value={attendanceDate}
                  onChange={handleAttendanceDateChange}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                />
              </div>

              {loadingAttendance ? (
                <div className="text-center text-sm text-gray-500 py-4">Buscando registros...</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="block text-sm font-bold text-gray-700">Entrada</label>
                    <input 
                      type="time" 
                      value={attendanceData.entry_time}
                      onChange={e => setAttendanceData({...attendanceData, entry_time: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl p-2 text-center"
                    />
                    <button onClick={() => setTimeNow('entry_time')} className="text-xs bg-gray-100 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-200">
                      Entrou Agora
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="block text-sm font-bold text-gray-700">Saída</label>
                    <input 
                      type="time" 
                      value={attendanceData.exit_time}
                      onChange={e => setAttendanceData({...attendanceData, exit_time: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl p-2 text-center"
                    />
                    <button onClick={() => setTimeNow('exit_time')} className="text-xs bg-gray-100 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-200">
                      Saiu Agora
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setShowAttendanceModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveAttendance}
                  disabled={loadingAttendance}
                  className="flex-1 bg-vaga-blue text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
