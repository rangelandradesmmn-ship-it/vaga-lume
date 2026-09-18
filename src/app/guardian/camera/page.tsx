'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, ShieldAlert, ShieldCheck, Download, Mail, Edit2, Save, X } from 'lucide-react';

export default function GuardianCameraPage() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [router]);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setUserProfile(profileData);
      setNewEmail(profileData.camera_email || profileData.email);
    }
    
    setLoading(false);
  }

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveNewEmail = async () => {
    if (!newEmail.trim()) {
      alert("Por favor, insira um e-mail válido.");
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase
      .from('profiles')
      .update({ camera_email: newEmail.trim() })
      .eq('id', userProfile.id);

    setSavingEmail(false);
    if (error) {
      alert("Erro ao salvar o e-mail: " + error.message);
    } else {
      setUserProfile({ ...userProfile, camera_email: newEmail.trim() });
      setEditingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 bg-vaga-pink text-white flex items-center justify-between shadow-sm border-b border-pink-400">
        <Link href="/" className="text-white hover:text-pink-200">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-xl font-bold">Câmeras</h2>
        <div className="w-6" /> {/* Spacer */}
      </header>

      <main className="flex-1 w-full max-w-md p-6">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-3">
            <Camera size={32} className="text-vaga-pink" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">Circuito Interno (CFTV)</h3>
          <p className="text-gray-500 text-sm mt-1">Acompanhe a rotina do seu filho em tempo real</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Verificando acessos...</p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h4 className="font-bold text-gray-800 text-sm mb-4 uppercase tracking-wider">Seu Status de Acesso</h4>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
                  <div className="bg-gray-100 p-2 rounded-lg text-gray-500 mt-1">
                    <Mail size={20} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="text-xs text-gray-500 font-bold uppercase mb-1">E-mail Cadastrado na Intelbras</span>
                    
                    {editingEmail ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <input 
                          type="email" 
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full border border-vaga-gray rounded-lg p-2 text-sm focus:outline-none focus:border-vaga-pink"
                          placeholder="Digite o e-mail..."
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingEmail(false); setNewEmail(userProfile?.camera_email || userProfile?.email); }}
                            className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-lg text-xs"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={saveNewEmail}
                            disabled={savingEmail}
                            className="flex-1 bg-vaga-pink text-white font-bold py-2 rounded-lg text-xs disabled:opacity-50"
                          >
                            {savingEmail ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-800 break-all">{userProfile?.camera_email || userProfile?.email}</span>
                        <button 
                          onClick={() => setEditingEmail(true)}
                          className="text-vaga-pink p-1.5 hover:bg-pink-50 rounded-lg flex-shrink-0"
                          title="Alterar e-mail de acesso"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${userProfile?.camera_status === 'APROVADO' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {userProfile?.camera_status === 'APROVADO' ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-bold uppercase">Permissão</span>
                    <span className={`font-bold ${userProfile?.camera_status === 'APROVADO' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {userProfile?.camera_status === 'APROVADO' ? 'Aprovado' : 'Pendente de Aprovação'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions (only if approved) */}
            {userProfile?.camera_status === 'APROVADO' && userProfile?.camera_instructions && (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-5">
                <h4 className="font-bold text-green-800 text-sm mb-2">Instruções de Acesso</h4>
                <p className="text-sm text-green-700 whitespace-pre-wrap leading-relaxed">
                  {userProfile.camera_instructions}
                </p>
              </div>
            )}

            {/* Download App */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h4 className="font-bold text-gray-800 text-sm mb-4 uppercase tracking-wider text-center">Aplicativo Intelbras Guardian</h4>
              <p className="text-sm text-gray-500 text-center mb-6">
                Faça o download do aplicativo oficial da câmera no seu celular e utilize o e-mail cadastrado acima.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => openLink('https://play.google.com/store/apps/details?id=br.com.intelbras.guardian&hl=pt_BR')}
                  className="w-full bg-[#3DDC84] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Download size={20} /> Download para Android
                </button>
                <button 
                  onClick={() => openLink('https://apps.apple.com/br/app/intelbras-guardian/id1434094231')}
                  className="w-full bg-black text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Download size={20} /> Download para iOS
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
