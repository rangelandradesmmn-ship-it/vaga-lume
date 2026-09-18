'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, HeartPulse, Shield } from 'lucide-react';

export default function ChildProfilePage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'health' | 'access'>('profile');
  
  const [child, setChild] = useState<any>({});
  const [health, setHealth] = useState<any>({});
  const [guardiansList, setGuardiansList] = useState<any[]>([]);
  const [availableParents, setAvailableParents] = useState<any[]>([]);
  const [selectedParentId, setSelectedParentId] = useState('');

  const router = useRouter();
  const childId = params.id;

  useEffect(() => {
    fetchChildData();
  }, [childId]);

  async function fetchChildData() {
    setLoading(true);
    // Fetch profile
    const { data: childData } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single();
    
    if (childData) setChild(childData);

    // Fetch health records
    const { data: healthData } = await supabase
      .from('health_records')
      .select('*')
      .eq('child_id', childId)
      .maybeSingle();

    if (healthData) {
      setHealth(healthData);
    } else {
      // Default empty health record
      setHealth({
        has_health_plan: false,
        takes_medication: false,
        has_allergies: false
      });
    }

    // Fetch linked guardians
    const { data: linked } = await supabase
      .from('guardians')
      .select('*, profiles(name, email)')
      .eq('child_id', childId);
    if (linked) setGuardiansList(linked);

    // Fetch available parents/guardians profiles
    const { data: parents } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'GUARDIAN');
    if (parents) setAvailableParents(parents);
    
    setLoading(false);
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (childId === 'new') {
      const { data, error } = await supabase
        .from('children')
        .insert(child)
        .select()
        .single();
      
      setSaving(false);
      if (error) alert("Erro ao salvar: " + error.message);
      else {
        alert("Criança cadastrada com sucesso!");
        router.push(`/admin/children/${data.id}`);
      }
    } else {
      const { error } = await supabase
        .from('children')
        .update(child)
        .eq('id', childId);
      
      setSaving(false);
      if (error) alert("Erro ao salvar: " + error.message);
      else alert("Ficha salva com sucesso!");
    }
  };

  const handleSaveHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('health_records')
      .upsert({ ...health, child_id: childId });
    
    setSaving(false);
    if (error) alert("Erro ao salvar saúde: " + error.message);
    else alert("Dados de saúde salvos com sucesso!");
  };

  const handleLinkParent = async () => {
    if (!selectedParentId) return;
    setSaving(true);
    const { error } = await supabase.from('guardians').insert({
      user_id: selectedParentId,
      child_id: childId,
      relationship: 'Responsável'
    });
    setSaving(false);
    if (error) alert("Erro ao vincular: " + error.message);
    else {
      alert("Responsável vinculado ao aplicativo com sucesso!");
      setSelectedParentId('');
      fetchChildData();
    }
  };

  const handleUnlinkParent = async (guardianId: string) => {
    if (!confirm("Tem certeza que deseja remover o acesso deste responsável?")) return;
    const { error } = await supabase.from('guardians').delete().eq('id', guardianId);
    if (error) alert("Erro ao remover: " + error.message);
    else fetchChildData();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6 border-b pb-4">
        <Link href="/admin/children" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          {params.id === 'new' ? 'Nova Criança' : child.name}
        </h1>
      </div>

      {(params.id !== 'new') && (
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'bg-vaga-blue text-gray-800 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <User size={18} /> Identificação
          </button>
          <button 
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'health' ? 'bg-vaga-yellow text-gray-800 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <HeartPulse size={18} /> Saúde & Desenvolvimento
          </button>
          <button 
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'access' ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            <Shield size={18} /> Acesso ao App
          </button>
        </div>
      )}

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input type="text" value={child.name || ''} onChange={e => setChild({...child, name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
              <input type="date" value={child.birth_date || ''} onChange={e => setChild({...child, birth_date: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
              <input type="text" value={child.address || ''} onChange={e => setChild({...child, address: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Mãe/Responsável 1</label>
              <input type="text" value={child.mother_name || ''} onChange={e => setChild({...child, mother_name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Pai/Responsável 2</label>
              <input type="text" value={child.father_name || ''} onChange={e => setChild({...child, father_name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefones de Contato</label>
              <input type="text" value={child.contact_phones || ''} onChange={e => setChild({...child, contact_phones: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail para Contato</label>
              <input type="email" value={child.contact_email || ''} onChange={e => setChild({...child, contact_email: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Com quem a criança reside?</label>
              <input type="text" value={child.lives_with || ''} onChange={e => setChild({...child, lives_with: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                <input type="checkbox" checked={child.has_siblings || false} onChange={e => setChild({...child, has_siblings: e.target.checked})} className="w-4 h-4 text-vaga-blue border-gray-300 rounded" />
                A criança tem irmãos?
              </label>
            </div>
            {child.has_siblings && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomes e idades dos irmãos</label>
                <textarea value={child.siblings_info || ''} onChange={e => setChild({...child, siblings_info: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg min-h-[80px]" />
              </div>
            )}
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={saving} className="bg-vaga-blue font-bold px-6 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm">
              <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Identificação'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'health' && (
        <form onSubmit={handleSaveHealth} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Em caso de emergência avisar:</label>
              <input type="text" value={health.emergency_contact || ''} onChange={e => setHealth({...health, emergency_contact: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" placeholder="Nomes e telefones" />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={health.has_health_plan || false} onChange={e => setHealth({...health, has_health_plan: e.target.checked})} className="w-4 h-4 rounded" />
                Tem plano de saúde?
              </label>
              {health.has_health_plan && (
                <input type="text" value={health.health_plan_name || ''} onChange={e => setHealth({...health, health_plan_name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" placeholder="Qual plano?" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pediatra Responsável</label>
              <input type="text" value={health.pediatrician || ''} onChange={e => setHealth({...health, pediatrician: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg" placeholder="Nome e telefone" />
            </div>

            <div className="md:col-span-2 flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={health.takes_medication || false} onChange={e => setHealth({...health, takes_medication: e.target.checked})} className="w-4 h-4 rounded" />
                Faz uso de alguma medicação?
              </label>
              {health.takes_medication && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Qual(is) e horários?</label>
                  <textarea value={health.medication_info || ''} onChange={e => setHealth({...health, medication_info: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg min-h-[60px]" />
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <input type="checkbox" checked={health.has_allergies || false} onChange={e => setHealth({...health, has_allergies: e.target.checked})} className="w-4 h-4 rounded" />
                Possui alergias?
              </label>
              {health.has_allergies && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quais?</label>
                  <textarea value={health.allergies_info || ''} onChange={e => setHealth({...health, allergies_info: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg min-h-[60px]" />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Anotações Gerais / Observações</label>
              <textarea value={health.notes || ''} onChange={e => setHealth({...health, notes: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg min-h-[100px]" />
            </div>
          </div>
          <div className="pt-4">
            <button type="submit" disabled={saving} className="bg-vaga-yellow text-gray-800 font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm w-full md:w-auto justify-center">
              <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Saúde'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'access' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          
          <div className="mb-6 border-b pb-6">
            <h3 className="font-bold text-gray-800 mb-2">Responsáveis Vinculados</h3>
            <p className="text-sm text-gray-500 mb-4">Estas pessoas têm acesso à timeline e aos dados desta criança pelo aplicativo.</p>
            
            {guardiansList.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500 text-sm">
                Nenhum responsável vinculado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {guardiansList.map(guardian => (
                  <div key={guardian.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-800">{guardian.profiles?.name}</p>
                      <p className="text-sm text-gray-500">{guardian.profiles?.email}</p>
                    </div>
                    <button onClick={() => handleUnlinkParent(guardian.id)} className="text-red-400 hover:text-red-600 text-sm font-bold bg-white px-3 py-1 rounded-lg border border-gray-200">
                      Remover Acesso
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-gray-800 mb-2">Vincular Novo Responsável</h3>
            <p className="text-sm text-gray-500 mb-4">Selecione uma conta criada por um pai/mãe para dar acesso à ficha desta criança.</p>
            
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <select 
                  value={selectedParentId}
                  onChange={e => setSelectedParentId(e.target.value)}
                  className="w-full p-3 border border-vaga-gray rounded-xl outline-none focus:border-vaga-blue bg-white text-gray-700"
                >
                  <option value="">-- Selecione uma conta --</option>
                  {availableParents.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({parent.email})
                    </option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleLinkParent}
                disabled={!selectedParentId || saving}
                className="bg-green-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-600 disabled:opacity-50 whitespace-nowrap"
              >
                Vincular
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
