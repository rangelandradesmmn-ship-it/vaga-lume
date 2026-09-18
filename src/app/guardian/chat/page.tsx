'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Mic, Image as ImageIcon, Download, Trash2, StopCircle, BellRing } from 'lucide-react';

export default function GuardianChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [guardianId, setGuardianId] = useState<string | null>(null);
  
  // Media states
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Polling for new messages
    if (!chatId) return;
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [chatId]);

  async function initChat() {
    setLoading(true);
    // Limpar mídia expirada
    await supabase.rpc('clean_expired_media');
    
    // Atualiza a leitura para remover bolinha vermelha
    localStorage.setItem('vagalume_last_chat', new Date().toISOString());
    sessionStorage.removeItem('vagalume_notified_chat_sound');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setGuardianId(user.id);

    // Fetch user profile to see if they are PROFESSIONAL
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    let childId = localStorage.getItem('vagalume_child_id');
    
    // Se não tiver childId no localStorage, busca no banco se for GUARDIAN
    if (!childId && profileData?.role !== 'PROFESSIONAL') {
      const { data: guardianData } = await supabase
        .from('guardians')
        .select('child_id')
        .eq('user_id', user.id)
        .single();
      if (guardianData) childId = guardianData.child_id;
    }

    if (!childId && profileData?.role !== 'PROFESSIONAL') {
      setLoading(false);
      return;
    }

    // Buscar ou criar Chat
    let query = supabase
      .from('chats')
      .select('id')
      .eq('guardian_id', user.id);
      
    if (profileData?.role === 'PROFESSIONAL') {
      query = query.is('child_id', null);
    } else {
      query = query.eq('child_id', childId);
    }

    let { data: chatDataArray } = await query.order('created_at', { ascending: true }).limit(1);
    let chatData = chatDataArray?.[0];

    if (!chatData) {
      const { data: newChat } = await supabase
        .from('chats')
        .insert({ guardian_id: user.id, child_id: profileData?.role === 'PROFESSIONAL' ? null : childId })
        .select('id')
        .limit(1);
      chatData = newChat?.[0];
    }

    if (chatData) {
      setChatId(chatData.id);
      await fetchMessages(chatData.id);
    }
    setLoading(false);
  }

  async function fetchMessages(cId = chatId) {
    if (!cId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', cId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  }

  const handleSendMessage = async (contentStr: string, type: string = 'text', base64: string | null = null, isUrgent: boolean = false) => {
    if (!chatId || !guardianId) return;
    
    // Clear any active alarms directed at me for this chat
    await supabase.from('messages').update({ is_urgent: false }).eq('chat_id', chatId).eq('is_urgent', true);

    // Optistic update
    const tempMsg = {
      id: Math.random().toString(),
      chat_id: chatId,
      sender_id: guardianId,
      content: contentStr,
      media_type: type,
      media_base64: base64,
      is_urgent: isUrgent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: guardianId,
      content: contentStr,
      media_type: type,
      media_base64: base64,
      is_urgent: isUrgent
    });

    if (error) {
      alert("Erro ao enviar mensagem.");
      fetchMessages(); // revert
    }
  };

  const handleUrgentAlert = () => {
    if (!confirm("Enviar ALERTA DE URGÊNCIA estilo Nextel para a Administração? O celular da direção vai tocar sem parar até eles responderem!")) return;
    handleSendMessage("[ALERTA DE URGÊNCIA] Por favor, responda imediatamente.", 'text', null, true);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    handleSendMessage(newMessage.trim(), 'text', null);
  };

  // Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Imagem muito grande. Limite de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      handleSendMessage("Imagem enviada", 'image', base64String);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result as string;
          handleSendMessage("Áudio enviado", 'audio', base64String);
        };
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      alert("Erro ao acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const downloadBase64File = (base64Data: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#ece5dd] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center gap-4 bg-vaga-blue text-white shadow-sm sticky top-0 z-10">
        <Link href="/" className="text-white hover:text-gray-200">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold flex items-center gap-2">
            Fale Conosco
          </h2>
          <p className="text-xs text-blue-100">Escola Vaga-lume</p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md p-4 flex flex-col gap-3 overflow-y-auto pb-24">
        {loading ? (
          <p className="text-center text-gray-500 mt-10">Carregando mensagens...</p>
        ) : messages.length === 0 ? (
          <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-sm text-yellow-800 shadow-sm mx-4 mt-4">
            Envie uma mensagem para a secretaria da escola. Suas imagens e áudios ficam disponíveis por 24 horas por segurança.
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === guardianId;
            return (
              <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMine ? 'self-end' : 'self-start'}`}>
                <div className={`p-3 rounded-2xl shadow-sm ${isMine ? 'bg-[#dcf8c6] rounded-br-sm' : 'bg-white rounded-bl-sm'}`}>
                  {/* TEXT */}
                  {msg.media_type === 'text' && (
                    <p className="text-gray-800 text-sm">{msg.content}</p>
                  )}
                  
                  {/* EXPIRED MEDIA */}
                  {(msg.media_type === 'image' || msg.media_type === 'audio') && msg.media_deleted && (
                    <p className="text-gray-500 text-sm italic">{msg.content}</p>
                  )}

                  {/* IMAGE */}
                  {msg.media_type === 'image' && !msg.media_deleted && msg.media_base64 && (
                    <div className="flex flex-col gap-2">
                      <img src={msg.media_base64} alt="Enviada" className="rounded-xl max-h-[200px] object-cover" />
                      <button 
                        onClick={() => downloadBase64File(msg.media_base64, `imagem_${msg.id}.png`)}
                        className="flex items-center justify-center gap-1 text-xs font-bold text-gray-600 bg-black/5 p-2 rounded-lg hover:bg-black/10"
                      >
                        <Download size={14} /> Baixar (24h)
                      </button>
                    </div>
                  )}

                  {/* AUDIO */}
                  {msg.media_type === 'audio' && !msg.media_deleted && msg.media_base64 && (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <audio controls src={msg.media_base64} className="w-full h-[40px]" />
                      <button 
                        onClick={() => downloadBase64File(msg.media_base64, `audio_${msg.id}.webm`)}
                        className="flex items-center justify-center gap-1 text-xs font-bold text-gray-600 bg-black/5 p-1 rounded-lg hover:bg-black/10"
                      >
                        <Download size={14} /> Baixar
                      </button>
                    </div>
                  )}
                  
                  <span className="text-[10px] text-gray-400 block text-right mt-1">
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Bar */}
      <div className="w-full max-w-md bg-[#f0f0f0] p-3 flex items-center gap-2 border-t border-gray-200 z-20 fixed bottom-0">
        <button 
          onClick={handleUrgentAlert}
          title="Enviar Alerta de Urgência (Toca no celular da direção até responderem)"
          className="p-3 text-red-500 hover:bg-red-50 rounded-full transition-colors"
        >
          <BellRing size={24} />
        </button>

        <input 
          type="file" 
          accept="image/*" 
          capture="environment"
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleImageUpload} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-gray-500 hover:text-vaga-blue"
        >
          <ImageIcon size={24} />
        </button>

        <form onSubmit={handleTextSubmit} className="flex-1 flex items-center bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
          <input 
            type="text" 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Mensagem..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </form>

        {newMessage.trim() ? (
          <button onClick={handleTextSubmit} className="p-3 bg-vaga-blue text-white rounded-full shadow-sm hover:opacity-90">
            <Send size={20} />
          </button>
        ) : (
          <button 
            onClick={toggleRecording}
            className={`p-3 rounded-full shadow-sm transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-vaga-blue text-white hover:opacity-90'}`}
          >
            {recording ? <StopCircle size={20} /> : <Mic size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}
