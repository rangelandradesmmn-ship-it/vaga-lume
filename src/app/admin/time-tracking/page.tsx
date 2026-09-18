'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Fingerprint, Calendar as CalendarIcon, Edit2, AlertCircle } from 'lucide-react';

export default function AdminTimeTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState('');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [records, setRecords] = useState<any>({});
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedProf, setSelectedProf] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    setTargetDate(today);
  }, []);

  const [globalBank, setGlobalBank] = useState<any>({});

  useEffect(() => {
    if (targetDate) {
      fetchData(targetDate);
    }
  }, [targetDate]);

  async function fetchData(date: string) {
    setLoading(true);

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, name, professionals(work_schedule)')
      .eq('role', 'PROFESSIONAL')
      .order('name');
      
    if (profs) setProfessionals(profs);

    // Fetch all attendances to calculate global bank
    const { data: allAtts } = await supabase
      .from('professional_attendance')
      .select('professional_id, date, hours_balance');

    let attMap: any = {}; // today's attendance
    let bankMap: any = {}; // global bank per prof
    let attDatesPerProf: any = {}; // to know if a Folga Extra was already treated

    if (profs) {
      profs.forEach(p => {
        bankMap[p.id] = 0;
        attDatesPerProf[p.id] = new Set();
      });
    }

    if (allAtts) {
      allAtts.forEach(a => {
        if (a.date === date) attMap[a.professional_id] = a;
        if (bankMap[a.professional_id] !== undefined) {
          bankMap[a.professional_id] += (a.hours_balance || 0);
          attDatesPerProf[a.professional_id].add(a.date);
        }
      });
    }

    // Now subtract 'Folga Extra' from schedule if not treated in attendance
    if (profs) {
      profs.forEach(p => {
        let schedule = Array.isArray(p.professionals) ? p.professionals[0]?.work_schedule : p.professionals?.work_schedule;
        if (typeof schedule === 'string') {
          try { schedule = JSON.parse(schedule); } catch (e) { schedule = null; }
        }
        if (schedule && typeof schedule === 'object' && !Array.isArray(schedule)) {
          Object.keys(schedule).forEach(dateKey => {
            const val = schedule[dateKey];
            if (val && typeof val === 'string' && val.toLowerCase().includes('extra')) {
              // It's a Folga Extra. Deduct 480 mins (8 hours) if no attendance record overrides it
              if (!attDatesPerProf[p.id].has(dateKey)) {
                bankMap[p.id] -= 480;
              }
            }
          });
        }
      });
    }

    setGlobalBank(bankMap);
    setRecords(attMap);
    setLoading(false);
  }

  const openModal = (prof: any) => {
    setSelectedProf(prof);
    const rec = records[prof.id] || {};
    setFormData({
      entry_time: rec.entry_time || '',
      lunch_start: rec.lunch_start || '',
      lunch_end: rec.lunch_end || '',
      exit_time: rec.exit_time || '',
      status: rec.status || 'PRESENTE',
      warnings: rec.warnings || '',
      hours_balance: rec.hours_balance || 0,
      original_entry: rec.entry_time,
      original_lunch_s: rec.lunch_start,
      original_lunch_e: rec.lunch_end,
      original_exit: rec.exit_time,
      is_edited_entry: rec.is_edited_entry || false,
      is_edited_lunch_s: rec.is_edited_lunch_s || false,
      is_edited_lunch_e: rec.is_edited_lunch_e || false,
      is_edited_exit: rec.is_edited_exit || false
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Check if edited
    const is_edited_entry = formData.is_edited_entry || (formData.original_entry !== formData.entry_time && !!formData.entry_time);
    const is_edited_lunch_s = formData.is_edited_lunch_s || (formData.original_lunch_s !== formData.lunch_start && !!formData.lunch_start);
    const is_edited_lunch_e = formData.is_edited_lunch_e || (formData.original_lunch_e !== formData.lunch_end && !!formData.lunch_end);
    const is_edited_exit = formData.is_edited_exit || (formData.original_exit !== formData.exit_time && !!formData.exit_time);

    const upsertData = {
      professional_id: selectedProf.id,
      date: targetDate,
      entry_time: formData.entry_time || null,
      lunch_start: formData.lunch_start || null,
      lunch_end: formData.lunch_end || null,
      exit_time: formData.exit_time || null,
      status: formData.status,
      warnings: formData.warnings || null,
      hours_balance: formData.hours_balance,
      is_edited_entry,
      is_edited_lunch_s,
      is_edited_lunch_e,
      is_edited_exit
    };

    const { data, error } = await supabase
      .from('professional_attendance')
      .upsert(upsertData, { onConflict: 'professional_id, date' })
      .select()
      .single();

    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setShowModal(false);
      setRecords({ ...records, [selectedProf.id]: data });
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6 border-b pb-4">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Fingerprint className="text-vaga-pink" /> Tratamento de Ponto
        </h1>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-pink-50 p-3 rounded-full text-vaga-pink">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Selecione o Dia</h3>
            <p className="text-sm text-gray-500">Tratar ponto de toda a equipe</p>
          </div>
        </div>
        <input 
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          className="border border-gray-200 rounded-xl p-3 font-bold text-gray-700 bg-gray-50 focus:bg-white"
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-10">Carregando ponto da equipe...</p>
      ) : (
        <div className="w-full overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-bold text-gray-700">Profissional</th>
                <th className="p-4 font-bold text-gray-700 text-center">Entrada</th>
                <th className="p-4 font-bold text-gray-700 text-center">Saída Almoço</th>
                <th className="p-4 font-bold text-gray-700 text-center">Volta Almoço</th>
                <th className="p-4 font-bold text-gray-700 text-center">Saída</th>
                <th className="p-4 font-bold text-gray-700 text-center">Status</th>
                <th className="p-4 font-bold text-gray-700 text-center">Banco Total</th>
                <th className="p-4 font-bold text-gray-700 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {professionals.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Nenhum profissional cadastrado.</td></tr>
              ) : (
                professionals.map((prof, idx) => {
                  const rec = records[prof.id];
                  const totalBank = globalBank[prof.id] || 0;
                  
                  const formatMinutes = (m: number) => {
                    const sign = m < 0 ? '-' : '+';
                    const abs = Math.abs(m);
                    const hrs = Math.floor(abs / 60);
                    const mins = abs % 60;
                    return `${sign}${hrs}h${mins > 0 ? String(mins).padStart(2, '0') + 'm' : ''}`;
                  };

                  const renderTime = (time: string, edited: boolean) => {
                    if (!time) return <span className="text-gray-300">-</span>;
                    return (
                      <span className={`font-bold ${edited ? 'text-yellow-600' : 'text-gray-800'}`}>
                        {time.substring(0, 5)} {edited && <span className="text-red-500 text-xs align-top" title="Editado pelo Admin">*</span>}
                      </span>
                    );
                  };

                  return (
                    <tr key={prof.id} className={idx !== professionals.length - 1 ? 'border-b border-gray-100 hover:bg-gray-50' : 'hover:bg-gray-50'}>
                      <td className="p-4 align-middle">
                        <div className="font-bold text-gray-800">{prof.name}</div>
                        {rec?.warnings && <div className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12}/> Advertência</div>}
                      </td>
                      <td className="p-4 align-middle text-center">{renderTime(rec?.entry_time, rec?.is_edited_entry)}</td>
                      <td className="p-4 align-middle text-center">{renderTime(rec?.lunch_start, rec?.is_edited_lunch_s)}</td>
                      <td className="p-4 align-middle text-center">{renderTime(rec?.lunch_end, rec?.is_edited_lunch_e)}</td>
                      <td className="p-4 align-middle text-center">{renderTime(rec?.exit_time, rec?.is_edited_exit)}</td>
                      <td className="p-4 align-middle text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          !rec?.status || rec?.status === 'PRESENTE' ? 'bg-green-100 text-green-700' : 
                          rec?.status === 'FALTA' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {rec?.status || 'PRESENTE'}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-center">
                        <span className={`font-bold text-sm ${totalBank < 0 ? 'text-red-500' : totalBank > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                          {totalBank === 0 ? 'Zerad.' : formatMinutes(totalBank)}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-center">
                        <button 
                          onClick={() => openModal(prof)}
                          className="text-vaga-pink hover:bg-pink-50 p-2 rounded-lg flex items-center justify-center mx-auto"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedProf && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl my-8">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-1">
              <Edit2 className="text-vaga-pink" />
              Tratamento de Ponto
            </h2>
            <p className="text-sm text-gray-500 mb-6">Profissional: <strong>{selectedProf.name}</strong></p>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Entrada</label>
                  <input type="time" value={formData.entry_time} onChange={e => setFormData({...formData, entry_time: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Saída Almoço</label>
                  <input type="time" value={formData.lunch_start} onChange={e => setFormData({...formData, lunch_start: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Volta Almoço</label>
                  <input type="time" value={formData.lunch_end} onChange={e => setFormData({...formData, lunch_end: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Saída</label>
                  <input type="time" value={formData.exit_time} onChange={e => setFormData({...formData, exit_time: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase mt-2">Status do Dia</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl font-bold">
                  <option value="PRESENTE">Presente</option>
                  <option value="FALTA">Falta</option>
                  <option value="ATESTADO">Atestado Médico</option>
                  <option value="AFASTAMENTO">Afastamento / Licença</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Banco de Horas (Minutos)</label>
                <input type="number" placeholder="Ex: -30 ou 60" value={formData.hours_balance} onChange={e => setFormData({...formData, hours_balance: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl" />
                <p className="text-[10px] text-gray-400 mt-1">Ex: -30 (saiu cedo) ou 60 (hora extra)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-red-500 mb-1 uppercase">Advertências / Observações</label>
                <textarea value={formData.warnings} onChange={e => setFormData({...formData, warnings: e.target.value})} className="w-full p-3 border border-red-200 rounded-xl bg-red-50 min-h-[80px]" placeholder="Motivo de falta ou atraso..." />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-vaga-pink text-white font-bold py-3 rounded-xl hover:opacity-90">{saving ? 'Salvando...' : 'Salvar Ponto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
