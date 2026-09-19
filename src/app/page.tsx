'use client';

import { Calendar, Users, User, HeartPulse, ListOrdered, Utensils, Moon, Droplets, Palette, Baby, Columns, Bell, Camera, MessageCircle, Clock, LogOut, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const menuItems = [
  { name: 'Calendário', icon: Calendar, color: 'bg-vaga-yellow', route: '/common/calendar' },
  { name: 'Quem Somos', icon: Users, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/common/about' },
  { name: 'Perfil', icon: User, color: 'bg-vaga-blue', route: '/guardian/profile' },
  { name: 'Saúde & Desenvolvimento', icon: HeartPulse, color: 'bg-vaga-yellow', route: '/guardian/profile' },
  { name: 'Faixa Etária', icon: ListOrdered, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/guardian/age-group' },
  { name: 'Alimentação', icon: Utensils, color: 'bg-vaga-yellow', route: '/guardian/timeline?filter=meal' },
  { name: 'Sono', icon: Moon, color: 'bg-vaga-blue', route: '/guardian/timeline?filter=sleep' },
  { name: 'Banho', icon: Droplets, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/guardian/timeline?filter=bath' },
  { name: 'Atividades', icon: Palette, color: 'bg-vaga-yellow', route: '/guardian/activities' },
  { name: 'Fralda', icon: Baby, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/guardian/timeline?filter=diaper' },
  { name: 'Pilares de Trabalho', icon: Columns, color: 'bg-vaga-blue', route: '/guardian/pillars' },
  { name: 'Notificações', icon: Bell, color: 'bg-vaga-yellow', route: '/common/notifications' },
  { name: 'Cardápio', icon: Utensils, color: 'bg-vaga-blue', route: '/common/menu' },
  { name: 'Câmera', icon: Camera, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/guardian/camera' },
  { name: 'Fale Conosco', icon: MessageCircle, color: 'bg-vaga-yellow', route: '/guardian/chat' },
  { name: 'Horário da Criança', icon: Clock, color: 'bg-vaga-blue', route: '/guardian/schedule' },
];

export default function Home() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const router = useRouter();
  const [stats, setStats] = useState({ children: 0, guardians: 0, professionals: 0, menus: 0, invites: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    async function getUser() {
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
        
      if (isMounted && localStorage.getItem('vagalume_role') === 'GUARDIAN') {
        profileData.role = 'GUARDIAN';
      }

      setProfile(profileData);
      
      // Função comum para tocar som e vibrar
      const triggerAlert = (storageKey: string) => {
        if (!sessionStorage.getItem(storageKey)) {
          try {
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // A4
            
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
            
            sessionStorage.setItem(storageKey, 'true');
          } catch (e) {
            console.log('Autoplay bloqueado pelo navegador');
          }
        }
      };

      if (profileData?.role === 'ADMIN') {
        const [
          { count: childrenCount },
          { count: guardiansCount },
          { count: profsCount },
          { count: menusCount },
          { count: invitesCount }
        ] = await Promise.all([
          supabase.from('children').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'GUARDIAN'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'PROFESSIONAL'),
          supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('type', 'MENU'),
          supabase.from('invites').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          children: childrenCount || 0,
          guardians: guardiansCount || 0,
          professionals: profsCount || 0,
          menus: menusCount || 0,
          invites: invitesCount || 0
        });

        // Check for new chat messages for ADMIN
        const { data: latestMsg } = await supabase
          .from('messages')
          .select('created_at')
          .neq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestMsg) {
          const lastRead = localStorage.getItem('vagalume_last_chat');
          const latestDate = new Date(latestMsg.created_at).getTime();
          const lastReadDate = lastRead ? new Date(lastRead).getTime() : 0;
          if (latestDate > lastReadDate) {
            setHasNewMessage(true);
            triggerAlert('vagalume_notified_chat_sound');
          }
        }

      } else {
        // Verificar novas notificações (Notificações)
        const { data: latestNotif } = await supabase
          .from('announcements')
          .select('created_at')
          .eq('type', 'NOTIFICATION')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (latestNotif) {
          const lastRead = localStorage.getItem('vagalume_last_notif');
          const latestDate = new Date(latestNotif.created_at).getTime();
          const lastReadDate = lastRead ? new Date(lastRead).getTime() : 0;
          
          if (latestDate > lastReadDate) {
            setHasNewNotification(true);
            triggerAlert('vagalume_notified_sound');
          }
        }

        // Verificar novas mensagens no Chat (Pais e Profissionais)
        if (profileData?.role === 'GUARDIAN' || profileData?.role === 'PROFESSIONAL') {
          // Buscar todos os chats envolvidos
          let query = supabase.from('chats').select('id');
          if (profileData?.role === 'PROFESSIONAL') {
            query = query.or(`guardian_id.eq.${user.id},recipient_id.eq.${user.id}`);
          } else {
            query = query.eq('guardian_id', user.id);
          }

          const { data: userChats } = await query;

          if (userChats && userChats.length > 0) {
            const chatIds = userChats.map(c => c.id);
            const { data: latestMsgs } = await supabase
              .from('messages')
              .select('chat_id, created_at, sender_id')
              .in('chat_id', chatIds)
              .neq('sender_id', user.id)
              .order('created_at', { ascending: false });

            if (latestMsgs && latestMsgs.length > 0) {
              // Checa se ALGUMA mensagem não lida de qualquer chat
              let hasUnread = false;
              for (const msg of latestMsgs) {
                const readTimeStr = localStorage.getItem(`read_chat_${msg.chat_id}`);
                const readTime = readTimeStr ? new Date(readTimeStr).getTime() : 0;
                const msgTime = new Date(msg.created_at).getTime();
                if (msgTime > readTime) {
                  hasUnread = true;
                  break;
                }
              }

              if (hasUnread) {
                setHasNewMessage(true);
                triggerAlert('vagalume_notified_chat_sound');
              }
            }
          }
        }
      }
      
      setLoading(false);
    }
    
    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">Carregando...</div>;

  if (profile?.role === 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#fafafa] p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Painel do Administrador</h1>
            <p className="text-sm text-gray-500">Logado como {profile.email}</p>
          </div>
          <button onClick={handleLogout} className="text-vaga-pink font-bold flex items-center gap-2">
            <LogOut size={20} /> Sair
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/admin/children" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow">
             <span className="text-3xl font-bold text-vaga-blue">{stats.children}</span>
             <span className="text-xs text-gray-500 uppercase mt-1">Crianças</span>
          </Link>
          <Link href="/admin/guardians" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow">
             <span className="text-3xl font-bold text-vaga-pink">{stats.guardians}</span>
             <span className="text-xs text-gray-500 uppercase mt-1 text-center">Responsáveis</span>
          </Link>
          <Link href="/admin/professionals" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow">
             <span className="text-3xl font-bold text-vaga-yellow">{stats.professionals}</span>
             <span className="text-xs text-gray-500 uppercase mt-1 text-center">Profissionais</span>
          </Link>
          <Link href="/common/menu" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow">
             <span className="text-3xl font-bold text-green-400">{stats.menus}</span>
             <span className="text-xs text-gray-500 uppercase mt-1">Cardápios</span>
          </Link>
          <Link href="/admin/invites" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow">
             <span className="text-3xl font-bold text-vaga-pink">{stats.invites}</span>
             <span className="text-xs text-gray-500 uppercase mt-1 text-center">Convites</span>
          </Link>
          <Link href="/common/calendar" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:shadow-md transition-shadow">
             <Calendar className="text-vaga-blue mb-1" size={32} />
             <span className="text-xs text-gray-500 uppercase mt-1">Calendário</span>
          </Link>
          <Link href="/common/about" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-vaga-gray flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <Users className="text-vaga-pink mb-2" size={32} />
            <h3 className="font-bold text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1">QUEM SOMOS</h3>
          </Link>
          
          <Link href="/common/notifications" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-vaga-gray flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <Bell className="text-vaga-yellow mb-2" size={32} />
            <h3 className="font-bold text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1">NOTIFICAÇÕES</h3>
          </Link>
          
          <Link href="/admin/chat" className="relative bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-vaga-gray flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            {hasNewMessage && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <MessageCircle className="text-vaga-blue mb-2" size={32} />
            <h3 className="font-bold text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1">MENSAGENS</h3>
          </Link>

          <Link href="/admin/cameras" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-vaga-gray flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <Camera className="text-vaga-pink mb-2" size={32} />
            <h3 className="font-bold text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1">Câmeras</h3>
          </Link>

          <Link href="/admin/consolidation" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-vaga-gray flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <ListOrdered className="text-vaga-yellow mb-2" size={32} />
            <h3 className="font-bold text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1">Consolidação</h3>
          </Link>

          <Link href="/admin/schedules" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-vaga-gray flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <Calendar className="text-vaga-blue mb-2" size={32} />
            <h3 className="font-bold text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1">Escalas</h3>
          </Link>

          <Link href="/admin/time-tracking" className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-vaga-gray flex flex-col items-center justify-center hover:shadow-md transition-shadow">
            <Fingerprint className="text-vaga-pink mb-2" size={32} />
            <h3 className="font-bold text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider mt-1">Ponto Digital</h3>
          </Link>
        </div>
      </div>
    );
  }

  // Se for Profissional, renderizar o Dashboard de Profissional
  if (profile?.role === 'PROFESSIONAL') {
    const profMenu = [
      { name: 'Crianças', icon: Users, color: 'bg-vaga-blue', route: '/prof/children' },
      { name: 'Alimentação', icon: Utensils, color: 'bg-vaga-yellow', route: '/prof/meals' },
      { name: 'Sono', icon: Moon, color: 'bg-vaga-blue', route: '/prof/sleep' },
      { name: 'Banho', icon: Droplets, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/prof/bath' },
      { name: 'Pilares de Trabalho', icon: Columns, color: 'bg-vaga-blue', route: '/prof/pillars' },
      { name: 'Atividades', icon: Palette, color: 'bg-vaga-yellow', route: '/prof/activities' },
      { name: 'Fralda', icon: Baby, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/prof/bath' },
      { name: 'Horário', icon: Clock, color: 'bg-vaga-blue', route: '/prof/schedule' },
      { name: 'Cardápio', icon: Utensils, color: 'bg-vaga-yellow', route: '/common/menu' },
      { name: 'Calendário', icon: Calendar, color: 'bg-vaga-blue', route: '/common/calendar' },
      { name: 'Escalas', icon: Calendar, color: 'bg-vaga-blue', route: '/prof/schedules' },
      { name: 'Meu Ponto', icon: Fingerprint, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/prof/attendance' },
      { name: 'Notificações', icon: Bell, color: 'bg-vaga-pink', iconColor: 'text-white', route: '/common/notifications' },
      { name: 'Chat', icon: MessageCircle, color: 'bg-vaga-yellow', route: '/prof/chat' },
    ];

    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
        <header className="w-full max-w-md pt-8 pb-4 px-6 flex justify-between items-center bg-white shadow-sm border-b border-gray-100 mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-vaga-blue">Painel do Profissional</h2>
            <p className="text-sm font-semibold text-gray-600">Bom dia, {profile?.name}</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-vaga-pink">
            <LogOut size={18} />
          </button>
        </header>

        <main className="flex-1 w-full max-w-md px-4 pb-12">
          <h3 className="font-bold text-gray-800 mb-4 ml-2">Registros de Rotina</h3>
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {profMenu.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link key={index} href={item.route} className={`relative flex flex-col items-center justify-center p-2 ${item.color} rounded-2xl shadow-sm border border-vaga-gray aspect-square hover:opacity-90 hover:scale-[1.02] transition-all duration-200`}>
                  {item.name === 'Notificações' && hasNewNotification && (
                    <span className="absolute top-2 right-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                  {item.name === 'Chat' && hasNewMessage && (
                    <span className="absolute top-2 right-2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                  <div className={`mb-2 drop-shadow-md ${item.iconColor || 'text-gray-700'}`}>
                    <Icon size={26} strokeWidth={2.5} />
                  </div>
                  <span className="text-[0.60rem] sm:text-[0.65rem] font-bold text-gray-800 text-center leading-tight">
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </main>
      </div>
    );
  }

  // Dashboard Pais (Padrão)
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      {/* Banner de Impersonation */}
      {isMounted && localStorage.getItem('vagalume_role') && (
        <div className="w-full bg-vaga-blue text-white text-center py-2 text-sm font-bold flex justify-center items-center gap-4">
          <span>👀 Visualizando aplicativo como Pais</span>
          <button 
            onClick={() => {
              localStorage.removeItem('vagalume_role');
              localStorage.removeItem('vagalume_child_id');
              window.location.reload();
            }}
            className="bg-white text-vaga-blue px-3 py-1 rounded-full text-xs hover:bg-gray-100"
          >
            Voltar ao Admin
          </button>
        </div>
      )}

      <header className="w-full max-w-md pt-10 pb-6 px-6 bg-white shadow-sm border-b border-gray-100 flex justify-between items-center relative overflow-hidden">
        <div className="flex flex-col relative z-10">
          <h1 className="text-2xl font-bold text-gray-800">Olá, {profile?.name?.split(' ')[0] || 'Responsável'}!</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Acompanhe o dia do seu maior tesouro</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-400 relative z-10">
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 w-full max-w-md px-5 pt-8 pb-12 flex flex-col items-center">
        <div className="mb-8 w-40 flex justify-center drop-shadow-md">
          <img src="/logo.png" alt="Vagalume Logo" className="w-full h-auto" />
        </div>

        <div className="grid grid-cols-4 gap-3 sm:gap-4 w-full">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={index} href={item.route} className={`relative flex flex-col items-center justify-center p-2 ${item.color} rounded-2xl shadow-sm border border-vaga-gray aspect-square hover:opacity-90 hover:scale-[1.02] transition-all duration-200`}>
                {item.name === 'Notificações' && hasNewNotification && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
                {item.name === 'Fale Conosco' && hasNewMessage && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
                <div className={`mb-2 drop-shadow-md ${item.iconColor || 'text-gray-700'}`}>
                  <Icon size={26} strokeWidth={2.5} />
                </div>
                <span className="text-[0.60rem] sm:text-[0.65rem] font-bold text-gray-800 text-center leading-tight tracking-tight">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  );
}
