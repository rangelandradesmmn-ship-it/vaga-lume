'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Moon } from 'lucide-react';

export default function SleepRoutinePage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Form State
  const [selectedChild, setSelectedChild] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quality, setQuality] = useState('Tranquilo');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchChildren();
  }, []);

  async function fetchChildren() {
    setLoading(true);
    const { data } = await supabase.from('children').select('id, name').order('name');
    if (data) setChildren(data);
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) {
      alert("Selecione uma criança.");
      return;
    }
    
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('sleep_records').insert({
      child_id: selectedChild,
      professional_id: user?.id,
      start_time: startTime,
      end_time: endTime || null, // Se ainda estiver dormindo
      quality: quality,
      notes: notes,
      date: new Date().toISOString().split('T')[0],
    });

    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Registro de sono salvo com sucesso!");
      setStartTime('');
      setEndTime('');
      setNotes('');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center gap-4 bg-white shadow-sm border-b border-gray-100 mb-6">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Moon className="text-vaga-blue" size={20} />
            Diário de Sono
          </h2>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Criança</label>
            <select 
              value={selectedChild} 
              onChange={e => setSelectedChild(e.target.value)}
              className="w-full p-3 border border-vaga-gray rounded-xl bg-white focus:ring-2 focus:ring-vaga-blue outline-none"
              required
            >
              <option value="">Selecione uma criança...</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deitou às</label>
              <input 
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full p-3 border border-vaga-gray rounded-xl focus:ring-2 focus:ring-vaga-blue outline-none" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acordou às (opcional)</label>
              <input 
                type="time" 
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full p-3 border border-vaga-gray rounded-xl focus:ring-2 focus:ring-vaga-blue outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualidade do Sono</label>
            <div className="flex flex-col gap-2">
              {['Tranquilo', 'Agitado', 'Acordou Chorando'].map(status => (
                <label key={status} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${quality === status ? 'bg-blue-50 border-vaga-blue' : 'bg-white border-gray-200'}`}>
                  <input 
                    type="radio" 
                    name="quality" 
                    value={status}
                    checked={quality === status}
                    onChange={e => setQuality(e.target.value)}
                    className="w-4 h-4 text-vaga-blue"
                  />
                  <span className={`text-sm font-semibold ${quality === status ? 'text-gray-800' : 'text-gray-600'}`}>{status}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border border-vaga-gray rounded-xl min-h-[80px] focus:ring-2 focus:ring-vaga-blue outline-none" 
              placeholder="Ex: Demorou a pegar no sono..."
            />
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving || loading} className="w-full bg-vaga-blue text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 shadow-sm">
              <Save size={18} /> {saving ? 'Salvando...' : 'Registrar Sono'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
