'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, HeartPulse } from 'lucide-react';

export default function GuardianProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ident');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noChild, setNoChild] = useState(false);

  // States
  const [child, setChild] = useState<any>({});
  const [health, setHealth] = useState<any>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let childId = localStorage.getItem('vagalume_child_id');

    if (!childId) {
      // 1. Fetch guardian link
      const { data: guardianData } = await supabase
        .from('guardians')
        .select('child_id')
        .eq('user_id', user?.id)
        .single();

      if (!guardianData) {
        setNoChild(true);
        setLoading(false);
        return;
      }
      childId = guardianData.child_id;
    }

    // 2. Fetch child data
    const { data: childData } = await supabase.from('children').select('*').eq('id', childId).single();
    if (childData) setChild(childData);

    // 3. Fetch health records
    const { data: healthData } = await supabase.from('health_records').select('*').eq('child_id', childId).single();
    if (healthData) {
      setHealth(healthData);
    } else {
      setHealth({ child_id: childId }); // Prepara para insert
    }

    setLoading(false);
  }

  const handleSaveIdent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('children').update(child).eq('id', child.id);
    setSaving(false);
    if (error) alert("Erro ao salvar: " + error.message);
    else alert("Dados de identificação atualizados com sucesso!");
  };

  const handleSaveHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (health.id) {
      const { error } = await supabase.from('health_records').update(health).eq('id', health.id);
      if (error) alert("Erro ao atualizar: " + error.message);
      else alert("Saúde e desenvolvimento atualizados!");
    } else {
      const { data, error } = await supabase.from('health_records').insert({
        ...health,
        child_id: child.id
      }).select().single();
      if (error) alert("Erro ao criar ficha: " + error.message);
      else {
        setHealth(data);
        alert("Ficha de saúde criada!");
      }
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-2xl pt-8 pb-4 px-6 flex items-center gap-4 bg-white shadow-sm border-b border-gray-100 mb-6">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800">
            Perfil do Aluno
          </h2>
          <p className="text-sm text-vaga-blue font-semibold">{child.name}</p>
        </div>
      </header>

      {noChild ? (
        <main className="flex-1 w-full max-w-2xl px-4 pb-12">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Bem-vindo(a) ao Vaga-lume!</h3>
              <p className="text-gray-500 text-sm">Para começar, por favor, cadastre os dados do seu filho(a).</p>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              const { data: { user } } = await supabase.auth.getUser();
              
              // 1. Criar criança
              const { data: newChild, error: childError } = await supabase.from('children').insert(child).select().single();
              if (childError) {
                alert("Erro ao criar ficha: " + childError.message);
                setSaving(false);
                return;
              }

              // 2. Vincular ao pai
              const { error: linkError } = await supabase.from('guardians').insert({
                user_id: user?.id,
                child_id: newChild.id,
                relationship: 'Responsável'
              });

              if (linkError) {
                alert("Erro ao vincular: " + linkError.message);
                setSaving(false);
                return;
              }

              alert("Ficha criada com sucesso!");
              window.location.reload(); // Recarrega para buscar os dados corretos
            }} className="space-y-4 pt-4 border-t border-gray-100">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo da Criança</label>
                  <input type="text" required value={child.name || ''} onChange={e => setChild({...child, name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                  <input type="date" required value={child.birth_date || ''} onChange={e => setChild({...child, birth_date: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                  <input type="text" value={child.address || ''} onChange={e => setChild({...child, address: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome completo (Responsável)</label>
                  <input type="text" required value={child.mother_name || ''} onChange={e => setChild({...child, mother_name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seu Telefone</label>
                  <input type="text" required value={child.contact_phones || ''} onChange={e => setChild({...child, contact_phones: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={saving} className="w-full bg-vaga-blue text-white font-bold px-6 py-3 rounded-xl flex justify-center items-center gap-2 hover:opacity-90 shadow-sm">
                  {saving ? 'Processando...' : 'Cadastrar e Continuar'}
                </button>
              </div>
            </form>
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full max-w-2xl px-4 pb-12">

          
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setActiveTab('ident')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'ident' ? 'bg-vaga-blue text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <User size={18} /> Identificação
            </button>
            <button 
              onClick={() => setActiveTab('health')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${activeTab === 'health' ? 'bg-vaga-yellow text-gray-800' : 'bg-gray-100 text-gray-600'}`}
            >
              <HeartPulse size={18} /> Saúde & Desenvolvimento
            </button>
          </div>

          {activeTab === 'ident' && (
            <form onSubmit={handleSaveIdent} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input type="text" value={child.name || ''} onChange={e => setChild({...child, name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                  <input type="date" value={child.birth_date || ''} onChange={e => setChild({...child, birth_date: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                  <input type="text" value={child.address || ''} onChange={e => setChild({...child, address: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Mãe/Responsável 1</label>
                  <input type="text" value={child.mother_name || ''} onChange={e => setChild({...child, mother_name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Pai/Responsável 2</label>
                  <input type="text" value={child.father_name || ''} onChange={e => setChild({...child, father_name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefones de Contato</label>
                  <input type="text" value={child.contact_phones || ''} onChange={e => setChild({...child, contact_phones: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail para Contato</label>
                  <input type="email" value={child.contact_email || ''} onChange={e => setChild({...child, contact_email: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Com quem a criança reside?</label>
                  <input type="text" value={child.lives_with || ''} onChange={e => setChild({...child, lives_with: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-blue" />
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
                    <textarea value={child.siblings_info || ''} onChange={e => setChild({...child, siblings_info: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg min-h-[80px] outline-none focus:border-vaga-blue" />
                  </div>
                )}
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={saving} className="w-full md:w-auto bg-vaga-blue text-white font-bold px-6 py-3 rounded-xl flex justify-center items-center gap-2 hover:opacity-90 shadow-sm">
                  <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'health' && (
            <form onSubmit={handleSaveHealth} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Em caso de emergência avisar:</label>
                  <input type="text" value={health.emergency_contact || ''} onChange={e => setHealth({...health, emergency_contact: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-yellow" placeholder="Nomes e telefones" />
                </div>
                
                <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-xl">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={health.has_health_plan || false} onChange={e => setHealth({...health, has_health_plan: e.target.checked})} className="w-4 h-4 rounded text-vaga-yellow" />
                    Tem plano de saúde?
                  </label>
                  {health.has_health_plan && (
                    <input type="text" value={health.health_plan_name || ''} onChange={e => setHealth({...health, health_plan_name: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-yellow" placeholder="Qual plano?" />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 mt-1">Pediatra Responsável</label>
                  <input type="text" value={health.pediatrician || ''} onChange={e => setHealth({...health, pediatrician: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:border-vaga-yellow" placeholder="Nome e telefone" />
                </div>

                <div className="md:col-span-2 flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={health.takes_medication || false} onChange={e => setHealth({...health, takes_medication: e.target.checked})} className="w-4 h-4 rounded text-vaga-yellow" />
                    Faz uso de alguma medicação?
                  </label>
                  {health.takes_medication && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Qual(is) e horários?</label>
                      <textarea value={health.medication_info || ''} onChange={e => setHealth({...health, medication_info: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg min-h-[60px] outline-none focus:border-vaga-yellow" />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={health.has_allergies || false} onChange={e => setHealth({...health, has_allergies: e.target.checked})} className="w-4 h-4 rounded text-vaga-yellow" />
                    Possui alergias?
                  </label>
                  {health.has_allergies && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Quais?</label>
                      <textarea value={health.allergies_info || ''} onChange={e => setHealth({...health, allergies_info: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg min-h-[60px] outline-none focus:border-vaga-yellow" />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anotações Gerais / Observações</label>
                  <textarea value={health.notes || ''} onChange={e => setHealth({...health, notes: e.target.value})} className="w-full p-2 border border-gray-200 rounded-lg min-h-[100px] outline-none focus:border-vaga-yellow" />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={saving} className="w-full md:w-auto bg-vaga-yellow font-bold px-6 py-3 rounded-xl flex justify-center items-center gap-2 hover:opacity-90 shadow-sm text-gray-800">
                  <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Ficha de Saúde'}
                </button>
              </div>
            </form>
          )}
        </main>
      )}
    </div>
  );
}
