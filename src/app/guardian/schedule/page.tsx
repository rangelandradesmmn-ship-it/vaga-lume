'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';

export default function GuardianSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
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

    if (childId) {
      const { data } = await supabase
        .from('child_attendance')
        .select('*')
        .eq('child_id', childId)
        .order('date', { ascending: false });
      
      if (data) setAttendanceRecords(data);
    }

    setLoading(false);
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5); // Returns HH:MM
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 bg-vaga-blue text-white flex items-center justify-between shadow-sm border-b border-blue-400">
        <Link href="/" className="text-white hover:text-gray-200">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-xl font-bold">Horário da Criança</h2>
        <div className="w-6" /> {/* Spacer */}
      </header>

      <main className="flex-1 w-full max-w-md p-6">
        <div className="mb-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <Clock size={32} className="text-vaga-blue" />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">{childName || 'Carregando...'}</h3>
          <p className="text-gray-500 text-sm">Controle de entrada e saída</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Buscando histórico...</p>
        ) : attendanceRecords.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-2xl border border-gray-100 text-gray-500">
            Nenhum registro de ponto encontrado.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {attendanceRecords.map(record => (
              <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="border-b border-gray-50 pb-2 mb-1">
                  <span className="font-bold text-gray-700">{formatDate(record.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Entrada</span>
                    <span className="text-lg font-bold text-green-600">{formatTime(record.entry_time)}</span>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Saída</span>
                    <span className="text-lg font-bold text-vaga-pink">{formatTime(record.exit_time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
