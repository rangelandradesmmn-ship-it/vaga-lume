'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Users, Clock } from 'lucide-react';

export default function ChildrenAdminPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // States for new/edit child modal/form
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    address: '',
    class_name: '',
    age_group: '',
    age_group_notes: '',
    food_restrictions: ''
  });

  // States for Attendance
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedChildForAttendance, setSelectedChildForAttendance] = useState<any>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({ entry_time: '', exit_time: '' });
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchChildren();
  }, []);

  async function fetchChildren() {
    setLoading(true);
    const { data } = await supabase
      .from('children')
      .select('*')
      .order('name');
      
    if (data) setChildren(data);
    setLoading(false);
  }

  const openNewChildModal = () => {
    setEditingId(null);
    setFormData({ name: '', birth_date: '', address: '', class_name: '', age_group: '', age_group_notes: '', food_restrictions: '' });
    setShowModal(true);
  };

  const openEditChildModal = (child: any) => {
    setEditingId(child.id);
    setFormData({ 
      name: child.name || '', 
      birth_date: child.birth_date || '', 
      address: child.address || '', 
      class_name: child.class_name || '',
      age_group: child.age_group || '',
      age_group_notes: child.age_group_notes || '',
      food_restrictions: child.food_restrictions || ''
    });
    setShowModal(true);
  };

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

  const handleSaveAttendance = async () => {
    if (!selectedChildForAttendance) return;
    setLoadingAttendance(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    // Convert empty strings to null for time columns
    const payload = {
      child_id: selectedChildForAttendance.id,
      date: attendanceDate,
      entry_time: attendanceData.entry_time || null,
      exit_time: attendanceData.exit_time || null,
      professional_id: user?.id || null
    };

    // Upsert equivalent manually because unique constraint handles it
    const { data: existing } = await supabase
      .from('child_attendance')
      .select('id')
      .eq('child_id', selectedChildForAttendance.id)
      .eq('date', attendanceDate)
      .single();

    let error;
    if (existing) {
      const { error: upError } = await supabase
        .from('child_attendance')
        .update({ entry_time: payload.entry_time, exit_time: payload.exit_time })
        .eq('id', existing.id);
      error = upError;
    } else {
      const { error: inError } = await supabase
        .from('child_attendance')
        .insert([payload]);
      error = inError;
    }

    setLoadingAttendance(false);
    if (error) {
      alert("Erro ao salvar o ponto: " + error.message);
    } else {
      alert("Ponto registrado com sucesso!");
      setShowAttendanceModal(false);
    }
  };

  const setTimeNow = (field: 'entry_time' | 'exit_time') => {
    const now = new Date();
    // Use local time HH:MM
    const timeStr = now.toTimeString().substring(0, 5);
    setAttendanceData(prev => ({ ...prev, [field]: timeStr }));
  };

  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('children')
        .update({ 
          name: formData.name, 
          birth_date: formData.birth_date,
          address: formData.address,
          class_name: formData.class_name,
          age_group: formData.age_group,
          age_group_notes: formData.age_group_notes,
          food_restrictions: formData.food_restrictions
        })
        .eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('children')
        .insert([{ 
          name: formData.name, 
          birth_date: formData.birth_date,
          address: formData.address,
          class_name: formData.class_name,
          age_group: formData.age_group,
          age_group_notes: formData.age_group_notes,
          food_restrictions: formData.food_restrictions
        }]);
      error = insertError;
    }

    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setShowModal(false);
      setFormData({ name: '', birth_date: '', address: '', class_name: '', age_group: '', age_group_notes: '', food_restrictions: '' });
      setEditingId(null);
      fetchChildren();
      alert(`Criança ${editingId ? 'atualizada' : 'cadastrada'} com sucesso!`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8 border-b pb-4">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <Users className="text-vaga-blue" size={32} />
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Crianças</h1>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">Total cadastradas: {children.length}</p>
        <button 
          onClick={openNewChildModal}
          className="bg-vaga-blue text-gray-800 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:opacity-90"
        >
          <Plus size={18} /> Nova Criança
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid gap-4">
          {children.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
              Nenhuma criança cadastrada ainda.
            </div>
          ) : (
            children.map(child => (
              <div key={child.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{child.name}</h3>
                  <p className="text-sm text-gray-500">
                    Turma: {child.class_name || 'Não definida'} • 
                    Faixa: {child.age_group || 'Não definida'} • 
                    Nasc: {new Date(child.birth_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => openAttendanceModal(child)}
                    className="text-white bg-vaga-blue px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:opacity-90"
                  >
                    <Clock size={16} /> Ponto
                  </button>
                  <button 
                    onClick={() => openEditChildModal(child)}
                    className="text-vaga-pink bg-pink-50 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-pink-100"
                  >
                    Editar
                  </button>
                  <Link 
                    href={`/admin/children/${child.id}`}
                    className="text-vaga-blue bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-100"
                  >
                    Ver App
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Nova/Editar Criança */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-xl my-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              {editingId ? 'Editar Criança' : 'Nova Criança'}
            </h2>
            
            <form onSubmit={handleSaveChild} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Data de Nascimento</label>
                <input 
                  type="date" 
                  required 
                  value={formData.birth_date}
                  onChange={e => setFormData({...formData, birth_date: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Endereço</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                  placeholder="Rua, número, bairro..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Turma (Nome)</label>
                  <input 
                    type="text" 
                    value={formData.class_name}
                    onChange={e => setFormData({...formData, class_name: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                    placeholder="Ex: Turma A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Faixa Etária</label>
                  <select 
                    value={formData.age_group}
                    onChange={e => setFormData({...formData, age_group: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="4 a 11 meses">4 a 11 meses</option>
                    <option value="1 a 2">1 a 2 anos</option>
                    <option value="2 a 3">2 a 3 anos</option>
                    <option value="3 a 4">3 a 4 anos</option>
                    <option value="4 a 5">4 a 5 anos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Observações de Faixa Etária</label>
                <textarea 
                  value={formData.age_group_notes}
                  onChange={e => setFormData({...formData, age_group_notes: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white min-h-[80px]"
                  placeholder="Informações adicionais sobre o desenvolvimento..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Restrições Alimentares</label>
                <textarea 
                  value={formData.food_restrictions}
                  onChange={e => setFormData({...formData, food_restrictions: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white min-h-[80px]"
                  placeholder="Alergias, intolerâncias ou dietas específicas..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-vaga-blue text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
