'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Columns } from 'lucide-react';

export default function GuardianPillarsPage() {
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [child, setChild] = useState<any>(null);

  useEffect(() => {
    fetchEvaluation();
  }, []);

  async function fetchEvaluation() {
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
      // Buscar dados da criança
      const { data: childData } = await supabase
        .from('children')
        .select('name')
        .eq('id', childId)
        .single();
      
      if (childData) setChild(childData);

      // Buscar a última avaliação de pilares
      const { data: evalData } = await supabase
        .from('pillars_evaluations')
        .select(`
          *,
          profiles:professional_id (name)
        `)
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (evalData) setEvaluation(evalData);
    }
    
    setLoading(false);
  }

  const getLabel = (value: string) => {
    if (value === 'RS') return 'Realiza Sozinho';
    if (value === 'CS') return 'Com Suporte';
    if (value === 'NR') return 'Não realiza';
    return value;
  };

  const getColor = (value: string) => {
    if (value === 'RS') return 'text-green-600 bg-green-50 border-green-200';
    if (value === 'CS') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (value === 'NR') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center gap-4 bg-white shadow-sm border-b border-gray-100 mb-6 sticky top-0 z-10">
        <Link href="/" className="text-gray-500 hover:text-vaga-blue">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Columns className="text-vaga-blue" size={20} />
            Pilares de Trabalho
          </h2>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        {loading ? (
          <p className="text-center text-gray-500 mt-10">Carregando avaliação...</p>
        ) : !child ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
            Nenhuma criança vinculada a esta conta.
          </div>
        ) : !evaluation ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 text-vaga-blue rounded-full flex items-center justify-center mb-4">
              <Columns size={32} />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Nenhuma avaliação</h3>
            <p className="text-sm text-gray-500">Os professores ainda não registraram os pilares de trabalho para {child.name}.</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 text-xl mb-1">{child.name}</h3>
            <p className="text-sm text-gray-500 mb-6">Última avaliação: {new Date(evaluation.created_at).toLocaleDateString('pt-BR')}</p>
            
            <div className="space-y-4">
              {[
                { label: 'Social', value: evaluation.social },
                { label: 'Motor', value: evaluation.motor },
                { label: 'Cognitivo', value: evaluation.cognitivo },
                { label: 'Emocional', value: evaluation.emocional },
              ].map(item => (
                <div key={item.label} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="font-bold text-gray-700 mb-2 md:mb-0">{item.label}</span>
                  <div className={`px-4 py-2 rounded-xl border font-bold text-sm text-center ${getColor(item.value)}`}>
                    {item.value} - {getLabel(item.value)}
                  </div>
                </div>
              ))}
            </div>

            {evaluation.notes && (
              <div className="mt-6 space-y-3">
                <h4 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2">Anotações da Professora</h4>
                {(() => {
                  try {
                    const parsedNotes = JSON.parse(evaluation.notes);
                    if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
                      return parsedNotes.map((note: any, idx: number) => (
                        <div key={idx} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                          <h5 className="font-bold text-vaga-blue text-xs uppercase mb-1">{note.topic || 'Geral'}</h5>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                        </div>
                      ));
                    }
                    return null;
                  } catch (e) {
                    // Fallback for single legacy note
                    return (
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <h5 className="font-bold text-vaga-blue text-xs uppercase mb-1">{evaluation.notes_topic || 'Geral'}</h5>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{evaluation.notes}</p>
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="font-bold text-gray-700 text-sm mb-4 text-center">Assinado pelo Profissional</h4>
              {evaluation.signature ? (
                <div className="flex flex-col items-center">
                  <div className="bg-white border-b-2 border-gray-300 px-4 w-full max-w-[250px] flex justify-center">
                    {/* Exibe a assinatura base64 como imagem */}
                    <img src={evaluation.signature} alt="Assinatura" className="h-[80px] object-contain opacity-80" />
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{evaluation.profiles?.name || 'Profissional'}</span>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center italic">Sem assinatura digital</p>
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-500 text-center flex justify-center gap-4">
              <span><b>RS:</b> Realiza Sozinho</span>
              <span><b>CS:</b> Com Suporte</span>
              <span><b>NR:</b> Não realiza</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
