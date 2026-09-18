'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Shield, Trash2, Key } from 'lucide-react';
import { changeUserPassword } from '@/app/actions/guardian';

export default function GuardiansAdminPage() {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuardians();
  }, []);

  async function fetchGuardians() {
    setLoading(true);
    
    // Buscar todos os profiles com role = GUARDIAN
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'GUARDIAN')
      .order('created_at', { ascending: false });

    if (profiles) {
      // Buscar links
      const { data: links } = await supabase
        .from('guardians')
        .select('user_id, child_id, children(name)');

      const enriched = profiles.map(p => {
        const userLinks = links?.filter(l => l.user_id === p.id) || [];
        return {
          ...p,
          linkedChildren: userLinks.map(l => Array.isArray(l.children) ? (l.children[0] as any)?.name : (l.children as any)?.name).filter(Boolean)
        };
      });
      setGuardians(enriched);
    }
    setLoading(false);
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o acesso de ${name}? Eles perderão o acesso ao aplicativo imediatamente.`)) return;
    
    // Deleta o profile. O user do auth continua existindo no banco mas sem profile, o app vai barrar o acesso.
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert("Erro: " + error.message);
    else fetchGuardians();
  };

  const handlePasswordChange = async (id: string, name: string) => {
    const newPassword = prompt(`Digite a nova senha para ${name} (mínimo 6 caracteres):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    
    const result = await changeUserPassword(id, newPassword);
    if (result.success) {
      alert(`Senha de ${name} alterada com sucesso!`);
    } else {
      alert(`Erro ao alterar senha: ${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8 border-b pb-4">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-vaga-pink" />
          Gerenciar Pais e Responsáveis
        </h1>
      </div>

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Total cadastrados: {guardians.length}</p>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid gap-4">
          {guardians.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
              Nenhum responsável cadastrado ainda.
            </div>
          ) : (
            guardians.map(guardian => (
              <div key={guardian.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                    {guardian.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{guardian.email}</p>
                  
                  {guardian.linkedChildren.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {guardian.linkedChildren.map((childName: string, idx: number) => (
                        <span key={idx} className="bg-blue-50 text-vaga-blue text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
                          Responsável por: {childName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <span className="bg-yellow-50 text-yellow-600 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">
                        Nenhuma criança vinculada
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => handlePasswordChange(guardian.id, guardian.name)}
                    className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors shrink-0"
                    title="Mudar Senha"
                  >
                    <Key size={20} />
                  </button>
                  <button 
                    onClick={() => handleDelete(guardian.id, guardian.name)}
                    className="text-red-400 hover:text-red-600 p-2 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shrink-0"
                    title="Excluir Responsável"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
