'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';

export default function ProfChildrenPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    fetchChildren();
  }, []);

  async function fetchChildren() {
    setLoading(true);
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .order('name');
      
    if (data) setChildren(data);
    setLoading(false);
  }

  // Same impersonation logic as Admin to view child app
  const handleViewApp = (childId: string) => {
    localStorage.setItem('vagalume_role', 'GUARDIAN');
    localStorage.setItem('vagalume_child_id', childId);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-2xl pt-8 pb-4 px-6 flex items-center justify-between bg-white shadow-sm border-b border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-vaga-pink">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-vaga-blue" size={20} />
              Alunos da Turma
            </h2>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl px-4 pb-12">
        <div className="mb-4 flex justify-between items-center text-sm text-gray-500">
          <span>Total: {children.length} alunos</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 mt-10">Carregando crianças...</p>
        ) : children.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
            Nenhuma criança cadastrada ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {children.map(child => (
              <div key={child.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{child.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Turma: {child.class_name || 'Não definida'} &bull; Faixa Etária: {child.age_group || 'Não definida'}
                  </p>
                  {(child.food_restrictions || child.age_group_notes) && (
                    <div className="mt-3 space-y-2">
                      {child.food_restrictions && (
                        <div className="text-xs bg-red-50 text-red-700 p-2 rounded-lg border border-red-100 font-medium">
                          <b className="uppercase tracking-wide text-[10px]">Restrições:</b> {child.food_restrictions}
                        </div>
                      )}
                      {child.age_group_notes && (
                        <div className="text-xs bg-gray-50 text-gray-600 p-2 rounded-lg border border-gray-100">
                          <b className="uppercase tracking-wide text-[10px]">Notas:</b> {child.age_group_notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleViewApp(child.id)}
                    className="flex-1 md:flex-none px-4 py-2 bg-blue-50 text-vaga-blue font-bold rounded-xl text-sm hover:bg-blue-100 transition-colors"
                  >
                    Ver App
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
