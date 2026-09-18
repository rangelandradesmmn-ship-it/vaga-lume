'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Palette, Camera, Image as ImageIcon, X } from 'lucide-react';

export default function ProfActivitiesPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [activityDate, setActivityDate] = useState('');
  
  // Form states
  const [didActivity, setDidActivity] = useState(false);
  const [description, setDescription] = useState('');
  const [mediaBase64, setMediaBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredChildren(children);
    } else {
      setFilteredChildren(children.filter(c => c.name.toLowerCase().includes(search.toLowerCase())));
    }
  }, [search, children]);

  async function fetchChildren() {
    setLoading(true);
    const { data } = await supabase.from('children').select('*').order('name');
    if (data) {
      setChildren(data);
      setFilteredChildren(data);
    }
    
    // Also clean up expired media in background
    supabase.rpc('clean_expired_activities_media').then();
    
    setLoading(false);
  }

  const openModal = async (child: any) => {
    setSelectedChild(child);
    const today = new Date().toLocaleDateString('en-CA');
    setActivityDate(today);
    setShowModal(true);
    await loadActivity(child.id, today);
  };

  const loadActivity = async (childId: string, date: string) => {
    setLoadingData(true);
    const { data } = await supabase
      .from('child_activities')
      .select('*')
      .eq('child_id', childId)
      .eq('date', date)
      .single();
    
    if (data) {
      setDidActivity(data.did_activity);
      setDescription(data.description || '');
      setMediaBase64(data.media_base64 || null);
      setMediaType(data.media_type || null);
    } else {
      setDidActivity(false);
      setDescription('');
      setMediaBase64(null);
      setMediaType(null);
    }
    setLoadingData(false);
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setActivityDate(newDate);
    if (selectedChild) {
      await loadActivity(selectedChild.id, newDate);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("O arquivo não pode ter mais de 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaBase64(reader.result as string);
      setMediaType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaBase64(null);
    setMediaType(null);
  };

  const handleSave = async () => {
    if (!selectedChild) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();

    const upsertData = {
      child_id: selectedChild.id,
      date: activityDate,
      did_activity: didActivity,
      description: didActivity ? description : null,
      media_base64: didActivity ? mediaBase64 : null,
      media_type: didActivity ? mediaType : null,
      professional_id: user?.id || null
    };

    const { error } = await supabase
      .from('child_activities')
      .upsert(upsertData, { onConflict: 'child_id, date' });

    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setShowModal(false);
      alert("Atividade registrada com sucesso!");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 bg-white shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-gray-500 hover:text-vaga-yellow">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Palette className="text-vaga-yellow" />
          Atividades
        </h2>
        <div className="w-6" />
      </header>

      <main className="flex-1 w-full max-w-md p-4">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-vaga-yellow focus:border-transparent text-sm"
            placeholder="Buscar criança..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Carregando...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredChildren.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
                Nenhuma criança encontrada.
              </div>
            ) : (
              filteredChildren.map(child => (
                <div key={child.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{child.name}</span>
                    <span className="text-xs text-gray-500">Turma: {child.class_name || 'N/A'}</span>
                  </div>
                  <button 
                    onClick={() => openModal(child)}
                    className="bg-vaga-yellow text-gray-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-sm shrink-0"
                  >
                    <Palette size={16} /> Registrar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal Atividade */}
      {showModal && selectedChild && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm shadow-xl my-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Palette className="text-vaga-yellow" />
              Atividade Diária
            </h2>
            <p className="text-gray-500 text-sm mb-6">Registrando para: <strong>{selectedChild.name}</strong></p>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Data</label>
                <input 
                  type="date" 
                  value={activityDate}
                  onChange={handleDateChange}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                />
              </div>

              {loadingData ? (
                <div className="text-center text-sm text-gray-500 py-4">Buscando registros...</div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Realizou atividade?</label>
                    <select 
                      value={didActivity ? 'yes' : 'no'}
                      onChange={e => setDidActivity(e.target.value === 'yes')}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white"
                    >
                      <option value="no">Não</option>
                      <option value="yes">Sim</option>
                    </select>
                  </div>

                  {didActivity && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Descrição da Atividade</label>
                        <textarea 
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Descreva o que a criança fez hoje..."
                          className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white min-h-[100px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Mídia (disponível por 24h)</label>
                        
                        {/* Hidden file inputs */}
                        <input 
                          type="file" 
                          accept="image/*,video/*" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={handleFileChange} 
                        />
                        <input 
                          type="file" 
                          accept="image/*,video/*" 
                          capture="environment"
                          ref={cameraInputRef} 
                          className="hidden" 
                          onChange={handleFileChange} 
                        />

                        {mediaBase64 ? (
                          <div className="relative border border-gray-200 rounded-xl p-2 bg-gray-50 flex flex-col items-center">
                            <button 
                              onClick={removeMedia}
                              className="absolute top-2 right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200"
                            >
                              <X size={16} />
                            </button>
                            {mediaType?.startsWith('video/') ? (
                              <video src={mediaBase64} className="max-h-48 rounded-lg" controls />
                            ) : (
                              <img src={mediaBase64} alt="Preview" className="max-h-48 rounded-lg object-contain" />
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => cameraInputRef.current?.click()}
                              className="flex-1 flex flex-col items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 text-gray-600"
                            >
                              <Camera size={24} />
                              <span className="text-xs font-bold">Câmera</span>
                            </button>
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="flex-1 flex flex-col items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 text-gray-600"
                            >
                              <ImageIcon size={24} />
                              <span className="text-xs font-bold">Galeria</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loadingData || saving}
                  className="flex-1 bg-vaga-yellow text-gray-800 font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
