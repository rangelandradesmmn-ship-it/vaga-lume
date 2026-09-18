'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Ticket, Plus, CheckCircle, Copy, AlertCircle } from 'lucide-react';

export default function InvitesPage() {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    setLoading(true);
    const { data } = await supabase
      .from('invites')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setInvites(data);
    setLoading(false);
  }

  const handleGenerateClick = async () => {
    setSaving(true);
    
    const codeToSave = 'VAGA-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const { data: { user } } = await supabase.auth.getUser();

    // Define uma data de expiração distante (ex: daqui a 1 ano)
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);

    const { error } = await supabase.from('invites').insert({
      code: codeToSave,
      created_by: user?.id,
      used: false,
      expires_at: expires.toISOString()
    });

    setSaving(false);
    if (error) {
      alert("Erro ao criar convite: " + error.message);
    } else {
      fetchInvites();
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Código ${code} copiado para a área de transferência!`);
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
              <Ticket className="text-vaga-pink" size={20} />
              Convites
            </h2>
          </div>
        </div>
        
        <button 
          onClick={handleGenerateClick} 
          disabled={saving} 
          className={`p-2 text-white rounded-full transition-opacity ${saving ? 'bg-gray-300' : 'bg-vaga-pink hover:opacity-90'}`}
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        <div className="bg-pink-50 p-4 rounded-xl mb-6 flex gap-3 text-pink-800 border border-pink-200">
          <AlertCircle className="flex-shrink-0" size={24} />
          <div>
            <p className="text-sm">Gere códigos únicos para os pais se cadastrarem. Cada código só pode ser usado <b>uma única vez</b>.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 mt-10">Carregando convites...</p>
        ) : invites.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
            Nenhum convite gerado ainda.
          </div>
        ) : (
          <div className="grid gap-3">
            {invites.map(invite => (
              <div key={invite.id} className={`p-4 rounded-2xl border flex items-center justify-between ${invite.used ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-vaga-pink shadow-sm'}`}>
                <div>
                  <h3 className="font-mono font-bold tracking-widest text-lg text-gray-800">{invite.code}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {invite.used ? 'USADO' : 'DISPONÍVEL'} • Criado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {!invite.used ? (
                  <button onClick={() => copyToClipboard(invite.code)} className="p-2 text-vaga-pink hover:bg-pink-50 rounded-lg">
                    <Copy size={20} />
                  </button>
                ) : (
                  <CheckCircle size={20} className="text-gray-400" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
