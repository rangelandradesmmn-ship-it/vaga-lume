'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, ShieldCheck, Clock } from 'lucide-react';

export default function AdminCamerasPage() {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGuardians();
  }, []);

  async function fetchGuardians() {
    setLoading(true);
    // Fetch all profiles that are GUARDIAN
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, camera_status, camera_instructions')
      .eq('role', 'GUARDIAN')
      .order('name');
      
    if (data) setGuardians(data);
    setLoading(false);
  }

  const openModal = (guardian: any) => {
    setSelectedGuardian(guardian);
    setStatus(guardian.camera_status || 'PENDENTE');
    setInstructions(guardian.camera_instructions || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuardian) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        camera_status: status,
        camera_instructions: instructions
      })
      .eq('id', selectedGuardian.id);
      
    setSaving(false);
    
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setShowModal(false);
      fetchGuardians();
      alert("Acesso salvo com sucesso!");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8 border-b pb-4">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Camera className="text-vaga-pink" />
          Acesso às Câmeras
        </h1>
      </div>

      <div className="mb-6">
        <p className="text-gray-600">Total de pais cadastrados: {guardians.length}</p>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid gap-4">
          {guardians.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
              Nenhum pai cadastrado ainda.
            </div>
          ) : (
            guardians.map(guardian => (
              <div key={guardian.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{guardian.name}</h3>
                  <p className="text-sm text-gray-500">{guardian.camera_email || guardian.email}</p>
                  
                  <div className="mt-2 flex items-center gap-2">
                    {guardian.camera_status === 'APROVADO' ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md">
                        <ShieldCheck size={14} /> Aprovado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-md">
                        <Clock size={14} /> Pendente
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => openModal(guardian)}
                    className="text-white bg-vaga-pink px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:opacity-90"
                  >
                    Gerenciar Acesso
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && selectedGuardian && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-2 text-gray-800 flex items-center gap-2">
              <Camera className="text-gray-500" /> 
              Gerenciar Acesso
            </h2>
            <p className="text-sm text-gray-500 mb-6">Responsável: <strong>{selectedGuardian.name}</strong> ({selectedGuardian.camera_email || selectedGuardian.email})</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Status de Acesso</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full p-3 border border-vaga-gray rounded-xl font-medium"
                >
                  <option value="PENDENTE">Pendente de Aprovação</option>
                  <option value="APROVADO">Aprovado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Instruções / Observações (Apenas para Aprovados)</label>
                <textarea 
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  className="w-full p-3 border border-vaga-gray rounded-xl min-h-[100px]"
                  placeholder="Ex: Baixe o app e conecte no IP xxx com a senha yyy..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-vaga-pink text-white font-bold py-3 rounded-xl hover:opacity-90">{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
