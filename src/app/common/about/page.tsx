'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Users, Edit2, Save } from 'lucide-react';

export default function AboutPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('GUARDIAN');
  const [isEditing, setIsEditing] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Check role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile) setUserRole(profile.role);
    }

    // Fetch About text
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('type', 'ABOUT')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (data) {
      setContent(data.content);
      setRecordId(data.id);
    } else {
      setContent('Seja bem-vindo(a) ao Vaga-lume Centro de Desenvolvimento. Nossa missão é cuidar e desenvolver o potencial de cada criança com muito amor e dedicação.');
    }
    
    setLoading(false);
  }

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (recordId) {
      const { error } = await supabase.from('announcements').update({
        content: content
      }).eq('id', recordId);
      if (error) alert("Erro ao atualizar: " + error.message);
      else setIsEditing(false);
    } else {
      const { error, data } = await supabase.from('announcements').insert({
        type: 'ABOUT',
        title: 'Quem Somos',
        content: content,
        created_by: user?.id
      }).select().single();
      
      if (error) alert("Erro ao salvar: " + error.message);
      else {
        setRecordId(data.id);
        setIsEditing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center justify-between bg-white shadow-sm border-b border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-vaga-pink">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="text-vaga-pink" size={20} />
              Quem Somos
            </h2>
          </div>
        </div>
        
        {userRole === 'ADMIN' && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="p-2 bg-pink-50 text-vaga-pink rounded-full hover:bg-pink-100">
            <Edit2 size={20} />
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
          {/* Decoração superior */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-vaga-pink via-vaga-yellow to-vaga-blue"></div>
          
          <div className="flex flex-col items-center mb-6 mt-2">
            <div className="w-32 mb-4">
              <img src="/logo.png" alt="Vaga-lume Logo" className="w-full h-auto drop-shadow-sm" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 font-serif italic text-center leading-tight">
              Centro de Desenvolvimento<br/>Vaga-lume
            </h3>
          </div>

          {loading ? (
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          ) : isEditing ? (
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">Edite o texto abaixo:</label>
              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full p-4 border border-vaga-pink rounded-xl min-h-[250px] focus:ring-2 focus:ring-vaga-pink outline-none text-gray-700 leading-relaxed"
              />
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200">
                  Cancelar
                </button>
                <button onClick={handleSave} className="flex-1 bg-vaga-pink text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90">
                  <Save size={18} /> Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
