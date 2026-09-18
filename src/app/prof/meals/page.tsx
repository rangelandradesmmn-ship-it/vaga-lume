'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Utensils, AlertTriangle } from 'lucide-react';

export default function MealsRoutinePage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Menu State
  const [todayMenu, setTodayMenu] = useState<any>(null);
  
  const router = useRouter();

  // Form State
  const [selectedChild, setSelectedChild] = useState('');
  const [mealType, setMealType] = useState('Almoço');
  const [isRestricted, setIsRestricted] = useState(false);
  const [foodOffered, setFoodOffered] = useState('');
  const [acceptance, setAcceptance] = useState('Aceitou bem');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchChildren();
    fetchMenu();
  }, []);

  async function fetchChildren() {
    setLoading(true);
    const { data } = await supabase.from('children').select('id, name, food_restrictions').order('name');
    if (data) setChildren(data);
    setLoading(false);
  }

  async function fetchMenu() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('type', 'MENU')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      try {
        const parsed = JSON.parse(data.content);
        const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayStr = dayMap[new Date().getDay()];
        if (parsed[currentDayStr]) {
          setTodayMenu(parsed[currentDayStr]);
        }
      } catch (e) {
        console.error('Erro ao processar cardápio', e);
      }
    }
  }

  const getMealKey = (type: string) => {
    if (type === 'Café da Manhã') return 'breakfast';
    if (type === 'Lanche') return 'snack';
    if (type === 'Almoço') return 'lunch';
    if (type === 'Janta') return 'dinner';
    return '';
  };

  const currentMenuFood = todayMenu ? todayMenu[getMealKey(mealType)] : '';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) {
      alert("Selecione uma criança.");
      return;
    }
    
    let finalFood = isRestricted ? foodOffered : currentMenuFood;
    if (!finalFood) {
      if (isRestricted) {
        alert("Informe qual foi o alimento oferecido.");
        return;
      }
      finalFood = 'Cardápio não informado';
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('meals').insert({
      child_id: selectedChild,
      professional_id: user?.id,
      meal_type: mealType,
      food_offered: finalFood,
      acceptance: acceptance,
      notes: isRestricted ? `[Alimentação Restrita] ${notes}`.trim() : notes,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0]
    });

    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Registro de alimentação salvo com sucesso!");
      // Reset form
      setFoodOffered('');
      setIsRestricted(false);
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
            <Utensils className="text-vaga-yellow" size={20} />
            Alimentação
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
              className="w-full p-3 border border-vaga-gray rounded-xl bg-white focus:ring-2 focus:ring-vaga-yellow outline-none"
              required
            >
              <option value="">Selecione uma criança...</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>

          {selectedChild && children.find(c => c.id === selectedChild)?.food_restrictions && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <AlertTriangle size={18} />
                <h3 className="text-sm">Atenção: Restrição Alimentar / Alergia</h3>
              </div>
              <p className="text-sm text-red-800 font-medium">
                {children.find(c => c.id === selectedChild)?.food_restrictions}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Refeição</label>
            <div className="grid grid-cols-2 gap-2">
              {['Café da Manhã', 'Lanche', 'Almoço', 'Janta'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(type)}
                  className={`p-2 rounded-xl text-sm font-bold border transition-colors ${mealType === type ? 'bg-vaga-yellow text-gray-800 border-vaga-yellow shadow-sm' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cardápio do Dia</label>
            {!isRestricted ? (
              <div className="bg-white p-3 rounded-xl border border-yellow-200 text-sm text-gray-700 font-medium">
                {currentMenuFood || <span className="text-gray-400 italic">Nenhum cardápio cadastrado para hoje.</span>}
              </div>
            ) : (
              <input 
                type="text" 
                value={foodOffered}
                onChange={e => setFoodOffered(e.target.value)}
                className="w-full p-3 border border-vaga-gray rounded-xl focus:ring-2 focus:ring-vaga-yellow outline-none bg-white" 
                placeholder="O que foi oferecido?"
                required={isRestricted}
              />
            )}
            
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isRestricted}
                onChange={e => setIsRestricted(e.target.checked)}
                className="w-4 h-4 text-vaga-yellow rounded border-gray-300 focus:ring-vaga-yellow"
              />
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <AlertTriangle size={14} className="text-yellow-500" />
                Alimentação restrita / Diferente do cardápio
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aceitação</label>
            <div className="flex flex-col gap-2">
              {['Aceitou bem', 'Comeu parcialmente', 'Recusou'].map(status => (
                <label key={status} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${acceptance === status ? 'bg-blue-50 border-vaga-blue' : 'bg-white border-gray-200'}`}>
                  <input 
                    type="radio" 
                    name="acceptance" 
                    value={status}
                    checked={acceptance === status}
                    onChange={e => setAcceptance(e.target.value)}
                    className="w-4 h-4 text-vaga-blue"
                  />
                  <span className={`text-sm font-semibold ${acceptance === status ? 'text-gray-800' : 'text-gray-600'}`}>{status}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border border-vaga-gray rounded-xl min-h-[80px] focus:ring-2 focus:ring-vaga-yellow outline-none" 
              placeholder="Alguma nota sobre a refeição?"
            />
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving || loading} className="w-full bg-vaga-yellow text-gray-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 shadow-sm">
              <Save size={18} /> {saving ? 'Salvando...' : 'Registrar Alimentação'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
