'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell, Plus, Trash2 } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('GUARDIAN');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Pegar o role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile) setUserRole(profile.role);
    }

    // Pegar notificações
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('type', 'NOTIFICATION')
      .order('created_at', { ascending: false });
      
    if (data) {
      setNotifications(data);
      // Atualiza a hora da última leitura para desativar a bolinha vermelha e o som
      localStorage.setItem('vagalume_last_notif', new Date().toISOString());
      sessionStorage.removeItem('vagalume_notified_sound');
    }
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('announcements').insert({
      type: 'NOTIFICATION',
      title,
      content,
      created_by: user?.id
    });

    setSaving(false);
    if (error) alert("Erro ao salvar: " + error.message);
    else {
      setShowForm(false);
      setTitle('');
      setContent('');
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta notificação?")) return;
    
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) alert("Erro ao deletar: " + error.message);
    else fetchData();
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center justify-between bg-white shadow-sm border-b border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-vaga-yellow">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Bell className="text-vaga-yellow" size={20} />
              Notificações
            </h2>
          </div>
        </div>
        {userRole === 'ADMIN' && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="p-2 bg-vaga-yellow text-gray-800 rounded-full hover:bg-yellow-400"
          >
            <Plus size={20} />
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        {showForm && userRole === 'ADMIN' && (
          <form onSubmit={handleSave} className="bg-white p-5 rounded-3xl shadow-sm border border-yellow-200 mb-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800">Nova Notificação</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">X</button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-vaga-yellow"
                placeholder="Ex: Reunião de Pais..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
              <textarea 
                value={content} 
                onChange={e => setContent(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl min-h-[100px] outline-none focus:ring-2 focus:ring-vaga-yellow"
                placeholder="Digite a mensagem da notificação..."
                required
              />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-vaga-yellow text-gray-800 font-bold py-3 rounded-xl">
              {saving ? 'Publicando...' : 'Publicar Notificação'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-center text-gray-500 mt-10">Carregando...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500 shadow-sm">
            <Bell className="mx-auto text-gray-300 mb-3" size={32} />
            <p>Nenhuma notificação no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(notif => (
              <div key={notif.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-800 text-lg">{notif.title}</h4>
                  {userRole === 'ADMIN' && (
                    <button onClick={() => handleDelete(notif.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">{new Date(notif.created_at).toLocaleDateString('pt-BR')} às {new Date(notif.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed bg-yellow-50/50 p-4 rounded-xl border border-yellow-100/50">
                  {notif.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
