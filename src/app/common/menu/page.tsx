'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Utensils, Plus, Save, Calendar } from 'lucide-react';

type DayMenu = { breakfast: string, lunch: string, snack: string, dinner: string };
type WeekMenu = { [key: string]: DayMenu };

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Segunda-feira' },
  { id: 'tuesday', label: 'Terça-feira' },
  { id: 'wednesday', label: 'Quarta-feira' },
  { id: 'thursday', label: 'Quinta-feira' },
  { id: 'friday', label: 'Sexta-feira' }
];

export default function MenuPage() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('GUARDIAN');
  const [showForm, setShowForm] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Guardian Food Restrictions State
  const [childId, setChildId] = useState<string | null>(null);
  const [foodRestrictions, setFoodRestrictions] = useState('');
  const [savingRestrictions, setSavingRestrictions] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [activeDay, setActiveDay] = useState('monday');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [weekData, setWeekData] = useState<WeekMenu>({
    monday: { breakfast: '', lunch: '', snack: '', dinner: '' },
    tuesday: { breakfast: '', lunch: '', snack: '', dinner: '' },
    wednesday: { breakfast: '', lunch: '', snack: '', dinner: '' },
    thursday: { breakfast: '', lunch: '', snack: '', dinner: '' },
    friday: { breakfast: '', lunch: '', snack: '', dinner: '' },
  });

  useEffect(() => {
    if (isMounted) {
      fetchData();
    }
  }, [isMounted]);

  async function fetchData() {
    setLoading(true);
    
    // Pegar o role e possivelmente os dados da crianca se for pai
    const { data: { user } } = await supabase.auth.getUser();
    let currentRole = 'GUARDIAN';
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile) {
        setUserRole(profile.role);
        currentRole = profile.role;
      }
    }

    if (currentRole === 'GUARDIAN' || (isMounted && localStorage.getItem('vagalume_role') === 'GUARDIAN')) {
      let cid = isMounted ? localStorage.getItem('vagalume_child_id') : null;
      if (!cid && user) {
        const { data: guardianData } = await supabase
          .from('guardians')
          .select('child_id')
          .eq('user_id', user.id)
          .single();
        if (guardianData) cid = guardianData.child_id;
      }
      
      if (cid) {
        setChildId(cid);
        const { data: childData } = await supabase
          .from('children')
          .select('food_restrictions')
          .eq('id', cid)
          .single();
        if (childData) setFoodRestrictions(childData.food_restrictions || '');
      }
    }

    // Pegar cardápios
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('type', 'MENU')
      .order('created_at', { ascending: false });
      
    if (data) setMenus(data);
    setLoading(false);
  }

  const handleSaveRestrictions = async () => {
    if (!childId) return;
    setSavingRestrictions(true);
    const { error } = await supabase
      .from('children')
      .update({ food_restrictions: foodRestrictions })
      .eq('id', childId);
    setSavingRestrictions(false);
    if (error) alert("Erro ao salvar: " + error.message);
    else alert("Restrições alimentares salvas!");
  };

  const handleDayChange = (meal: keyof DayMenu, value: string) => {
    setWeekData(prev => ({
      ...prev,
      [activeDay]: {
        ...prev[activeDay],
        [meal]: value
      }
    }));
  };

  const handleEdit = (menu: any) => {
    setTitle(menu.title);
    setEditingId(menu.id);
    try {
      const parsed = JSON.parse(menu.content);
      setWeekData(parsed);
    } catch {
      // Se for texto simples antigo, reseta
      setWeekData({
        monday: { breakfast: '', lunch: '', snack: '', dinner: '' },
        tuesday: { breakfast: '', lunch: '', snack: '', dinner: '' },
        wednesday: { breakfast: '', lunch: '', snack: '', dinner: '' },
        thursday: { breakfast: '', lunch: '', snack: '', dinner: '' },
        friday: { breakfast: '', lunch: '', snack: '', dinner: '' },
      });
    }
    setShowForm(true);
    setActiveDay('monday');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cardápio?")) return;
    
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) alert("Erro ao excluir: " + error.message);
    else fetchData();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle('');
    setActiveDay('monday');
    setWeekData({
      monday: { breakfast: '', lunch: '', snack: '', dinner: '' },
      tuesday: { breakfast: '', lunch: '', snack: '', dinner: '' },
      wednesday: { breakfast: '', lunch: '', snack: '', dinner: '' },
      thursday: { breakfast: '', lunch: '', snack: '', dinner: '' },
      friday: { breakfast: '', lunch: '', snack: '', dinner: '' },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (editingId) {
      const { error } = await supabase.from('announcements').update({
        title,
        content: JSON.stringify(weekData)
      }).eq('id', editingId);

      if (error) alert("Erro ao atualizar: " + error.message);
      else {
        resetForm();
        fetchData();
      }
    } else {
      const { error } = await supabase.from('announcements').insert({
        type: 'MENU',
        title,
        content: JSON.stringify(weekData),
        created_by: user?.id
      });

      if (error) alert("Erro ao salvar: " + error.message);
      else {
        resetForm();
        fetchData();
      }
    }
  };

  const renderContent = (contentStr: string) => {
    try {
      const data: WeekMenu = JSON.parse(contentStr);
      // Se conseguir fazer o parse, renderizamos os dias estruturados
      return (
        <div className="space-y-4 mt-2">
          {DAYS_OF_WEEK.map(day => {
            const dayMenu = data[day.id];
            if (!dayMenu || (!dayMenu.breakfast && !dayMenu.lunch && !dayMenu.snack && !dayMenu.dinner)) return null;
            return (
              <div key={day.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-800 mb-2">{day.label}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  {dayMenu.breakfast && <p><b>Café da Manhã:</b> {dayMenu.breakfast}</p>}
                  {dayMenu.lunch && <p><b>Almoço:</b> {dayMenu.lunch}</p>}
                  {dayMenu.snack && <p><b>Lanche da Tarde:</b> {dayMenu.snack}</p>}
                  {dayMenu.dinner && <p><b>Janta:</b> {dayMenu.dinner}</p>}
                </div>
              </div>
            )
          })}
        </div>
      );
    } catch {
      // Caso seja um texto antigo não estruturado
      return <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed mt-2">{contentStr}</div>;
    }
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
              <Utensils className="text-vaga-blue" size={20} />
              Cardápio da Semana
            </h2>
          </div>
        </div>
        
        {userRole === 'ADMIN' && (
          <button onClick={() => showForm ? resetForm() : setShowForm(true)} className={`p-2 rounded-full hover:opacity-90 ${showForm ? 'bg-gray-200 text-gray-600' : 'bg-vaga-blue text-white'}`}>
            <Plus size={20} className={showForm ? 'rotate-45 transform transition-transform' : 'transition-transform'} />
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        {showForm && (
          <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6 space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2">{editingId ? 'Editar Cardápio' : 'Novo Cardápio'}</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título da Semana</label>
              <input 
                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                className="w-full p-2 border border-vaga-gray rounded-xl focus:ring-vaga-blue"
                placeholder="Ex: Semana 15 a 19 de Maio"
              />
            </div>

            <div className="pt-2">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.id} type="button"
                    onClick={() => setActiveDay(day.id)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${activeDay === day.id ? 'bg-vaga-blue text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {day.label.split('-')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Café da Manhã</label>
                <input 
                  type="text" value={weekData[activeDay].breakfast} onChange={e => handleDayChange('breakfast', e.target.value)}
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-vaga-blue outline-none"
                  placeholder="Ex: Maçã, Leite..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Almoço</label>
                <input 
                  type="text" value={weekData[activeDay].lunch} onChange={e => handleDayChange('lunch', e.target.value)}
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-vaga-blue outline-none"
                  placeholder="Ex: Feijão, Arroz..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lanche da Tarde</label>
                <input 
                  type="text" value={weekData[activeDay].snack} onChange={e => handleDayChange('snack', e.target.value)}
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-vaga-blue outline-none"
                  placeholder="Ex: Pão de queijo..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Janta</label>
                <input 
                  type="text" value={weekData[activeDay].dinner} onChange={e => handleDayChange('dinner', e.target.value)}
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-vaga-blue outline-none"
                  placeholder="Ex: Sopa de legumes..."
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200">
                Cancelar
              </button>
              <button type="submit" className="flex-1 bg-vaga-blue text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2">
                <Save size={18} /> {editingId ? 'Atualizar' : 'Publicar'}
              </button>
            </div>
          </form>
        )}

        {/* Formulário de Restrições (Apenas Pais) */}
        {(userRole === 'GUARDIAN' || (typeof window !== 'undefined' && localStorage.getItem('vagalume_role') === 'GUARDIAN')) && childId && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-yellow-200 mb-6">
            <h3 className="font-bold text-yellow-800 flex items-center gap-2 mb-2">
              <Utensils size={18} /> Restrições Alimentares / Alergias
            </h3>
            <p className="text-sm text-gray-600 mb-4">Informe aqui qualquer tipo de alergia ou restrição alimentar que a escola precise saber.</p>
            <textarea
              className="w-full p-3 border border-gray-200 rounded-xl min-h-[100px] mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Ex: Alergia a amendoim, intolerância à lactose..."
              value={foodRestrictions}
              onChange={e => setFoodRestrictions(e.target.value)}
            />
            <button
              onClick={handleSaveRestrictions}
              disabled={savingRestrictions}
              className="w-full bg-vaga-yellow text-gray-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Save size={18} /> {savingRestrictions ? 'Salvando...' : 'Salvar Restrições'}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500 mt-10">Carregando cardápios...</p>
        ) : menus.length === 0 ? (
          <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 text-center">
            <Utensils size={32} className="text-blue-300 mx-auto mb-4" />
            <p className="text-blue-800 font-semibold">Nenhum cardápio publicado ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {menus.map(menu => (
              <div key={menu.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-vaga-blue"></div>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-lg text-gray-800">{menu.title}</h3>
                  {userRole === 'ADMIN' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(menu)} className="text-xs font-bold text-vaga-blue bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">Editar</button>
                      <button onClick={() => handleDelete(menu.id)} className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100">Excluir</button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4 border-b pb-2 flex items-center gap-1">
                  <Calendar size={14} /> Publicado em {new Date(menu.created_at).toLocaleDateString('pt-BR')}
                </p>
                {renderContent(menu.content)}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
