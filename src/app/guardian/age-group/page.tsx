'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ListOrdered } from 'lucide-react';

export default function AgeGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let childId = localStorage.getItem('vagalume_child_id');

    if (!childId) {
      const { data: guardianData } = await supabase
        .from('guardians')
        .select('child_id')
        .eq('user_id', user?.id)
        .single();

      if (guardianData) {
        childId = guardianData.child_id;
      }
    }

    if (childId) {
      const { data: childData } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .single();
      
      setChild(childData);
    }
    
    setLoading(false);
  }

  const getAgeGroupContent = (ageGroup: string) => {
    switch(ageGroup) {
      case '0 a 1':
        return "Nesta fase, o foco é no desenvolvimento motor básico, estimulação sensorial, introdução alimentar e estabelecimento de vínculos afetivos seguros.";
      case '1 a 2':
        return "Nesta fase, trabalhamos a coordenação motora, os primeiros passos, o desenvolvimento da fala e a exploração do ambiente ao redor.";
      case '3 a 5':
        return "Fase de grande desenvolvimento social e cognitivo. Focamos na socialização, coordenação motora fina, criatividade e pré-alfabetização.";
      case '6 a 9':
        return "Foco no desenvolvimento da leitura, escrita, raciocínio lógico-matemático, autonomia e responsabilidade social.";
      default:
        return "A faixa etária desta criança ainda não foi classificada pela coordenação.";
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center gap-4 bg-white shadow-sm border-b border-gray-100 mb-6 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ListOrdered className="text-vaga-pink" size={20} />
            Faixa Etária
          </h2>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        {loading ? (
          <p className="text-center text-gray-500 mt-10">Carregando informações...</p>
        ) : !child ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
            Nenhuma criança vinculada a esta conta.
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 text-xl mb-1">{child.name}</h3>
            
            <div className="mt-6 mb-6">
              <span className="text-sm text-gray-500 uppercase font-bold tracking-wider">Classificação Atual:</span>
              <div className="bg-pink-50 border border-pink-100 text-vaga-pink font-bold text-2xl py-3 px-4 rounded-xl mt-2 inline-block">
                {child.age_group ? child.age_group + (child.age_group === '0 a 1' ? ' ano' : ' anos') : 'Não Definida'}
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-gray-700 leading-relaxed">
              <p>{child.age_group_notes || getAgeGroupContent(child.age_group)}</p>
            </div>
            
            <p className="text-xs text-gray-400 mt-6 text-center">Esta classificação é definida pela coordenação escolar de acordo com a turma e desenvolvimento do aluno.</p>
          </div>
        )}
      </main>
    </div>
  );
}
