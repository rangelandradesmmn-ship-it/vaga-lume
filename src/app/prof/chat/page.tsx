'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Mic, Image as ImageIcon, Download, StopCircle, User, MessageCircle, BellRing } from 'lucide-react';

export default function ProfChatPage() {
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newMessage, setNewMessage] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  
  // Media states
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initContacts();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(() => fetchMessages(selectedChat.chat_id), 3000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  async function initContacts() {
    setLoading(true);
    await supabase.rpc('clean_expired_media');
    
    localStorage.setItem('vagalume_last_chat', new Date().toISOString());
    sessionStorage.removeItem('vagalume_notified_chat_sound');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    // Buscar colegas profissionais (exceto eu)
    const { data: profsData } = await supabase
      .from('profiles')
      .select('id, name, professionals(role_title)')
      .eq('role', 'PROFESSIONAL')
      .neq('id', user.id);

    const parsedProfs = (profsData || []).map(p => ({
      id: p.id,
      user_id: p.id,
      child_id: null,
      name: p.name,
      sub_name: (Array.isArray(p.professionals) ? p.professionals[0]?.role_title : p.professionals?.role_title) || 'Colega',
      type: 'PROFESSIONAL'
    }));

    // Contato fixo da Direção
    const adminContact = {
      id: 'admin',
      user_id: 'ADMIN',
      child_id: null,
      name: 'Direção / RH',
      sub_name: 'Administração',
      type: 'ADMIN'
    };

    const combinedList = [adminContact, ...parsedProfs];

    // Buscar chats em que estou envolvido
    const { data: allChats } = await supabase
      .from('chats')
      .select('id, guardian_id, recipient_id')
      .or(`guardian_id.eq.${user.id},recipient_id.eq.${user.id}`);

    let unreadMap: Record<string, boolean> = {};

    if (allChats && allChats.length > 0) {
      const chatIds = allChats.map(c => c.id);
      const { data: latestMessages } = await supabase
        .from('messages')
        .select('chat_id, sender_id, created_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false });

      if (latestMessages) {
        allChats.forEach(chat => {
          const chatMsgs = latestMessages.filter(m => m.chat_id === chat.id);
          if (chatMsgs.length > 0) {
            const lastMsg = chatMsgs[0];
            if (lastMsg.sender_id !== user.id) {
              const readTimeStr = localStorage.getItem(`read_chat_${chat.id}`);
              const readTime = readTimeStr ? new Date(readTimeStr).getTime() : 0;
              const msgTime = new Date(lastMsg.created_at).getTime();
              if (msgTime > readTime) {
                // Determine the other party's id to mark them as unread
                // If it's Admin chat (recipient_id is null and guardian_id is me)
                if (!chat.recipient_id && chat.guardian_id === user.id) {
                  unreadMap['ADMIN'] = true;
                } else if (chat.recipient_id === user.id) {
                  unreadMap[chat.guardian_id] = true;
                } else if (chat.guardian_id === user.id) {
                  unreadMap[chat.recipient_id] = true;
                }
              }
            }
          }
        });
      }
    }

    const enriched = combinedList.map(g => ({
      ...g,
      hasUnread: unreadMap[g.user_id] || false
    }));

    const sorted = enriched.sort((a: any, b: any) => {
      if (a.hasUnread && !b.hasUnread) return -1;
      if (!a.hasUnread && b.hasUnread) return 1;
      if (a.type === 'ADMIN') return -1;
      if (b.type === 'ADMIN') return 1;
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    setContactsList(sorted);
    setLoading(false);
  }

  async function fetchMessages(cId: string) {
    if (!cId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', cId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  }

  const handleSelectChat = async (contact: any) => {
    let query = supabase.from('chats').select('id');
      
    if (contact.type === 'ADMIN') {
      query = query.eq('guardian_id', myId).is('recipient_id', null);
    } else {
      // Chat P2P: Either I am the guardian_id and they are recipient_id OR vice versa.
      // Small UUID is guardian, large UUID is recipient
      const isMyIdSmaller = myId! < contact.user_id;
      const guardianId = isMyIdSmaller ? myId : contact.user_id;
      const recipientId = isMyIdSmaller ? contact.user_id : myId;
      query = query.eq('guardian_id', guardianId).eq('recipient_id', recipientId);
    }

    let { data: chatDataArray } = await query.order('created_at', { ascending: true }).limit(1);
    let chatData = chatDataArray?.[0];

    if (!chatData) {
      // Criar chat
      let guardianId = myId;
      let recipientId = contact.type === 'ADMIN' ? null : contact.user_id;

      if (contact.type !== 'ADMIN') {
        const isMyIdSmaller = myId! < contact.user_id;
        guardianId = isMyIdSmaller ? myId : contact.user_id;
        recipientId = isMyIdSmaller ? contact.user_id : myId;
      }

      const { data: newChat } = await supabase
        .from('chats')
        .insert({ guardian_id: guardianId, child_id: null, recipient_id: recipientId })
        .select('id')
        .limit(1);
      chatData = newChat?.[0];
    }

    if (chatData) {
      localStorage.setItem(`read_chat_${chatData.id}`, new Date().toISOString());

      setContactsList(prev => prev.map(g => g.id === contact.id ? { ...g, hasUnread: false } : g));
      
      setSelectedChat({ ...contact, chat_id: chatData.id });
      fetchMessages(chatData.id);
    }
  };

  const handleSendMessage = async (contentStr: string, type: string = 'text', base64: string | null = null, isUrgent: boolean = false) => {
    if (!selectedChat || !myId) return;
    
    // Clear any active alarms directed at me for this chat
    await supabase.from('messages').update({ is_urgent: false }).eq('chat_id', selectedChat.chat_id).eq('is_urgent', true);

    const tempMsg = {
      id: Math.random().toString(),
      chat_id: selectedChat.chat_id,
      sender_id: myId,
      content: contentStr,
      media_type: type,
      media_base64: base64,
      is_urgent: isUrgent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      chat_id: selectedChat.chat_id,
      sender_id: myId,
      content: contentStr,
      media_type: type,
      media_base64: base64,
      is_urgent: isUrgent
    });

    if (error) {
      alert("Erro ao enviar mensagem.");
      fetchMessages(selectedChat.chat_id);
    }
  };

  const handleUrgentAlert = () => {
    if (!confirm("Enviar ALERTA DE URGÊNCIA estilo Nextel para este usuário? O celular dele vai tocar sem parar até ele responder!")) return;
    handleSendMessage("[ALERTA DE URGÊNCIA] Por favor, responda imediatamente.", 'text', null, true);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    handleSendMessage(newMessage.trim(), 'text', null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
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
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      alert("Erro ao acessar o microfone.");
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
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Sidebar - Lista de Pais */}
      <div className={`w-full md:w-1/3 bg-[#f0f0f0] border-r border-gray-200 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <header className="pt-8 pb-4 px-6 bg-vaga-blue text-white flex items-center gap-4 shadow-sm">
          <Link href="/" className="text-white hover:text-gray-200">
            <ArrowLeft size={24} />
          </Link>
          <h2 className="text-xl font-bold">Mensagens</h2>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-center text-gray-500">Carregando...</p>
          ) : contactsList.length === 0 ? (
            <p className="p-4 text-center text-gray-500">Nenhum responsável cadastrado.</p>
          ) : (
            contactsList.map(guardian => (
              <button 
                key={guardian.id} 
                onClick={() => handleSelectChat(guardian)}
                className={`relative w-full p-4 flex items-center gap-3 border-b border-gray-200 hover:bg-gray-200 transition-colors ${selectedChat?.id === guardian.id ? 'bg-gray-200' : 'bg-[#fafafa]'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-gray-500 ${guardian.hasUnread ? 'bg-vaga-blue/20 text-vaga-blue' : 'bg-gray-300'}`}>
                  <User size={24} />
                  {guardian.hasUnread && (
                    <span className="absolute top-4 left-4 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white"></span>
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`text-sm ${guardian.hasUnread ? 'font-extrabold text-black' : 'font-bold text-gray-800'}`}>
                    {guardian.name || 'Contato'}
                  </h3>
                  <p className={`text-xs line-clamp-1 ${guardian.hasUnread ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                    {guardian.type === 'GUARDIAN' ? `Aluno: ${guardian.sub_name || 'Não informado'}` : guardian.sub_name}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área do Chat */}
      {selectedChat ? (
        <div className="flex-1 bg-[#ece5dd] flex flex-col h-screen">
          <header className="pt-8 pb-4 px-6 bg-vaga-blue text-white flex items-center gap-4 shadow-sm z-10">
            <button onClick={() => setSelectedChat(null)} className="md:hidden text-white">
              <ArrowLeft size={24} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold">{selectedChat.name || 'Contato'}</h2>
              <p className="text-xs text-blue-100">
                {selectedChat.type === 'GUARDIAN' ? `Responsável por ${selectedChat.sub_name || ''}` : selectedChat.sub_name}
              </p>
            </div>
          </header>

          <main className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto pb-24">
            {messages.length === 0 ? (
              <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-sm text-yellow-800 shadow-sm mx-auto mt-4 max-w-sm">
                Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa!
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === myId;
                return (
                  <div key={msg.id} className={`flex flex-col max-w-[85%] md:max-w-[60%] ${isMine ? 'self-end' : 'self-start'}`}>
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
          <div className="w-full bg-[#f0f0f0] p-3 flex items-center gap-2 border-t border-gray-200 z-20 sticky bottom-0">
            <button 
              onClick={handleUrgentAlert}
              title="Enviar Alerta de Urgência (Toca no celular do usuário até ele responder)"
              className="p-3 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <BellRing size={24} />
            </button>

            <input 
              type="file" 
              accept="image/*" 
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
      ) : (
        <div className="hidden md:flex flex-1 bg-[#ece5dd] flex-col items-center justify-center">
          <div className="text-center text-gray-400 bg-white/50 p-6 rounded-3xl shadow-sm border border-white">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Selecione uma conversa na lista ao lado para começar.</p>
          </div>
        </div>
      )}
    </div>
  );
}
