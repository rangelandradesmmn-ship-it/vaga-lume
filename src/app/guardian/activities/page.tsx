'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Palette, Download, Image as ImageIcon } from 'lucide-react';

export default function GuardianActivitiesPage() {
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [activities, setActivities] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [router]);

  async function fetchData() {
    let childId = localStorage.getItem('vagalume_child_id');

    if (!childId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: guardianData } = await supabase
        .from('guardians')
        .select('child_id, children(name)')
        .eq('user_id', user.id)
        .single();

      if (!guardianData) {
        setLoading(false);
        return;
      }
      childId = guardianData.child_id;
      setChildName((Array.isArray(guardianData.children) ? (guardianData.children[0] as any)?.name : (guardianData.children as any)?.name) || '');
    } else {
      const { data: childData } = await supabase.from('children').select('name').eq('id', childId).single();
      if (childData) setChildName(childData.name);
    }

    // Clean expired media before fetching
    await supabase.rpc('clean_expired_activities_media');

    if (childId) {
      const { data } = await supabase
        .from('child_activities')
        .select('*')
        .eq('child_id', childId)
        .order('date', { ascending: false });
      
      if (data) setActivities(data);
    }

    setLoading(false);
  }

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const downloadMedia = (base64: string, type: string, date: string) => {
    const extension = type.startsWith('video/') ? 'mp4' : 'jpg';
    const filename = `atividade_${date.replace(/-/g, '')}.${extension}`;
    
    const a = document.createElement('href');
    const link = document.createElement('a');
    link.href = base64;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 bg-vaga-yellow text-gray-800 flex items-center justify-between shadow-sm border-b border-yellow-400">
        <Link href="/" className="text-gray-800 hover:opacity-70">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-xl font-bold">Atividades</h2>
        <div className="w-6" /> {/* Spacer */}
      </header>

      <main className="flex-1 w-full max-w-md p-6">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
            <Palette size={32} className="text-vaga-yellow" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">{childName || 'Carregando...'}</h3>
          <p className="text-gray-500 text-sm">Histórico de Atividades Diárias</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Buscando registros...</p>
        ) : activities.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activities.map(activity => (
              <div key={activity.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-gray-700">{formatDate(activity.date)}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${activity.did_activity ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {activity.did_activity ? 'Realizou Atividade' : 'Não Realizou'}
                  </span>
                </div>
                
                {activity.did_activity && (
                  <div className="p-4 flex flex-col gap-4">
                    {activity.description && (
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{activity.description}</p>
                    )}
                    
                    {activity.media_deleted ? (
                      <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 gap-2">
                        <ImageIcon size={24} />
                        <span className="text-xs text-center">A mídia expirou (limite de 24h)</span>
                      </div>
                    ) : activity.media_base64 ? (
                      <div className="flex flex-col gap-2">
                        {activity.media_type?.startsWith('video/') ? (
                          <video src={activity.media_base64} className="w-full rounded-xl bg-black" controls />
                        ) : (
                          <img src={activity.media_base64} alt="Atividade" className="w-full rounded-xl object-cover" />
                        )}
                        <button 
                          onClick={() => downloadMedia(activity.media_base64, activity.media_type, activity.date)}
                          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold py-2 rounded-xl text-sm hover:bg-gray-200"
                        >
                          <Download size={16} /> Baixar Arquivo
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
