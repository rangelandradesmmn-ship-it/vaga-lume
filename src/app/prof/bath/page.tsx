'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Droplets } from 'lucide-react';

export default function BathRoutinePage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedChild, setSelectedChild] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('Banho');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchChildren();
    // Default time to now
    setTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
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

    const { error } = await supabase.from('bath_records').insert({
      child_id: selectedChild,
      professional_id: user?.id,
      time: time,
      type: type,
      notes: notes,
      date: new Date().toISOString().split('T')[0],
    });

    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Registro salvo com sucesso!");
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
            <Droplets className="text-vaga-pink" size={20} />
            Higiene e Banho
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
              className="w-full p-3 border border-vaga-gray rounded-xl bg-white focus:ring-2 focus:ring-vaga-pink outline-none"
              required
            >
              <option value="">Selecione uma criança...</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
              <input 
                type="time" 
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full p-3 border border-vaga-gray rounded-xl focus:ring-2 focus:ring-vaga-pink outline-none" 
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Registro</label>
            <div className="flex flex-col gap-2">
              {['Banho', 'Troca de Fralda', 'Troca de Roupa', 'Escovação'].map(status => (
                <label key={status} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${type === status ? 'bg-pink-50 border-vaga-pink' : 'bg-white border-gray-200'}`}>
                  <input 
                    type="radio" 
                    name="type" 
                    value={status}
                    checked={type === status}
                    onChange={e => setType(e.target.value)}
                    className="w-4 h-4 text-vaga-pink"
                  />
                  <span className={`text-sm font-semibold ${type === status ? 'text-gray-800' : 'text-gray-600'}`}>{status}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border border-vaga-gray rounded-xl min-h-[80px] focus:ring-2 focus:ring-vaga-pink outline-none" 
              placeholder="Ex: Assadura leve, roupa sujou na tinta..."
            />
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving || loading} className="w-full bg-vaga-pink text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 shadow-sm">
              <Save size={18} /> {saving ? 'Salvando...' : 'Registrar Higiene'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
