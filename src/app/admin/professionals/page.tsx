'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Users, ShieldAlert, KeyRound } from 'lucide-react';
import { createProfessional, updateProfessional, updateProfessionalPassword } from '@/app/actions/professional';

export default function ProfessionalsAdminPage() {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasServiceRole, setHasServiceRole] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role_title: '',
    class_name: ''
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchProfessionals();
  }, []);

  async function fetchProfessionals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*, professionals(role_title, class_name)')
      .eq('role', 'PROFESSIONAL')
      .order('name');
      
    if (data) setProfessionals(data);
    setLoading(false);
  }

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (editingId) {
      const result = await updateProfessional(editingId, {
        name: formData.name,
        role_title: formData.role_title,
        class_name: formData.class_name
      });
      setSaving(false);
      if (result.success) {
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', email: '', phone: '', role_title: '', class_name: '' });
        fetchProfessionals();
        alert("Profissional atualizado com sucesso!");
      } else {
        alert("Erro ao atualizar: " + result.error);
      }
    } else {
      const result = await createProfessional(formData);
      setSaving(false);
      if (result.success) {
        setShowModal(false);
        setFormData({ name: '', email: '', phone: '', role_title: '', class_name: '' });
        fetchProfessionals();
        alert("Profissional cadastrado com sucesso! A senha padrão é: vagalume_trocar_senha");
      } else {
        if (result.error?.includes("SUPABASE_SERVICE_ROLE_KEY")) {
          setHasServiceRole(false);
        } else {
          alert("Erro ao cadastrar: " + result.error);
        }
      }
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', role_title: '', class_name: '' });
    setShowModal(true);
  };

  const openEditModal = (prof: any) => {
    setEditingId(prof.id);
    const profData = Array.isArray(prof.professionals) ? prof.professionals[0] : prof.professionals;
    setFormData({
      name: prof.name || '',
      email: prof.email || '',
      phone: prof.phone || '',
      role_title: profData?.role_title || '',
      class_name: profData?.class_name || ''
    });
    setShowModal(true);
  };

  const openPasswordModal = (prof: any) => {
    setEditingId(prof.id);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (newPassword.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setSaving(true);
    const result = await updateProfessionalPassword(editingId, newPassword);
    setSaving(false);
    
    if (result.success) {
      setShowPasswordModal(false);
      setEditingId(null);
      alert("Senha alterada com sucesso!");
    } else {
      alert("Erro ao alterar senha: " + result.error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o acesso do profissional ${name}?`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert("Erro: " + error.message);
    else fetchProfessionals();
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8 border-b pb-4">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-vaga-yellow" />
          Equipe e Profissionais
        </h1>
      </div>

      {!hasServiceRole && (
        <div className="bg-red-50 p-4 rounded-xl mb-6 flex gap-3 text-red-800 border border-red-200">
          <ShieldAlert className="flex-shrink-0" />
          <div>
            <h3 className="font-bold">Atenção! SERVICE_ROLE_KEY Ausente.</h3>
            <p className="text-sm">Para que o Administrador consiga criar ou alterar senhas, você precisa adicionar a variável <b>SUPABASE_SERVICE_ROLE_KEY</b> no arquivo <code>.env.local</code> e reiniciar o servidor.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Total na equipe: {professionals.length}</p>
        <button 
          onClick={openNewModal}
          className="bg-vaga-yellow text-gray-800 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:opacity-90"
        >
          <Plus size={18} /> Novo Profissional
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid gap-4">
          {professionals.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
              Nenhum profissional cadastrado ainda.
            </div>
          ) : (
            professionals.map(prof => (
              <div key={prof.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{prof.name}</h3>
                  <p className="text-sm text-gray-500">
                    Cargo: {(Array.isArray(prof.professionals) ? prof.professionals[0]?.role_title : prof.professionals?.role_title) || 'Não definido'} • Turma: {(Array.isArray(prof.professionals) ? prof.professionals[0]?.class_name : prof.professionals?.class_name) || 'Geral'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{prof.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openPasswordModal(prof)} className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-lg" title="Alterar Senha">
                    <KeyRound size={16} />
                  </button>
                  <button onClick={() => openEditModal(prof)} className="text-vaga-yellow text-sm font-semibold hover:underline">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(prof.id, prof.name)} className="text-red-400 text-sm font-semibold hover:underline">
                    Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800">{editingId ? 'Editar Profissional' : 'Cadastrar Profissional'}</h2>
            <form onSubmit={handleAddOrEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-vaga-gray rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail {editingId && '(Não pode ser alterado)'}</label>
                <input type="email" required disabled={!!editingId} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full p-2 border border-vaga-gray rounded-xl ${editingId ? 'bg-gray-100 text-gray-500' : ''}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border border-vaga-gray rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo/Função</label>
                  <input type="text" required value={formData.role_title} placeholder="Ex: Professora" onChange={e => setFormData({...formData, role_title: e.target.value})} className="w-full p-2 border border-vaga-gray rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turma Vinculada</label>
                  <input type="text" value={formData.class_name} placeholder="Ex: Berçário 1" onChange={e => setFormData({...formData, class_name: e.target.value})} className="w-full p-2 border border-vaga-gray rounded-xl" />
                </div>
              </div>
              
              {!editingId && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 mt-2">
                  O profissional receberá a senha temporária: <b>vagalume_trocar_senha</b>. Ele deverá acessar o app e alterar depois.
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-xl">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-vaga-yellow text-gray-800 font-bold py-2 rounded-xl">{saving ? 'Processando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <KeyRound className="text-gray-500" /> Alterar Senha
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input 
                  type="text" 
                  required 
                  minLength={6}
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full p-3 border border-vaga-gray rounded-xl" 
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-xl">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-gray-800 text-white font-bold py-2 rounded-xl">{saving ? 'Processando...' : 'Salvar Senha'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
