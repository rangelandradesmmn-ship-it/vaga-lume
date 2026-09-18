'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Columns, Eraser } from 'lucide-react';

export default function PillarsEvaluationPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Form State
  const [selectedChild, setSelectedChild] = useState('');
  const [social, setSocial] = useState('');
  const [motor, setMotor] = useState('');
  const [cognitivo, setCognitivo] = useState('');
  const [emocional, setEmocional] = useState('');
  
  const [notesTopic, setNotesTopic] = useState('Geral');
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState<{topic: string, text: string}[]>([]);

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    fetchChildren();
    initCanvas();
  }, []);

  async function fetchChildren() {
    setLoading(true);
    const { data } = await supabase.from('children').select('id, name').order('name');
    if (data) setChildren(data);
    setLoading(false);
  }

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#333';
      }
    }
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle both mouse and touch events
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
      }
    }
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(
      context!.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  };

  const handleAddNote = () => {
    if (!notes.trim()) return;
    setSavedNotes([...savedNotes, { topic: notesTopic, text: notes.trim() }]);
    setNotes('');
    setNotesTopic('Geral');
  };

  const handleRemoveNote = (index: number) => {
    setSavedNotes(savedNotes.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) {
      alert("Selecione uma criança.");
      return;
    }
    
    if (!social || !motor || !cognitivo || !emocional) {
      alert("Por favor, preencha todos os pilares.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || isCanvasBlank(canvas)) {
      alert("Por favor, assine a avaliação.");
      return;
    }

    // Se o usuário digitou algo mas não clicou em "Adicionar", vamos adicionar automaticamente
    let finalNotes = [...savedNotes];
    if (notes.trim()) {
      finalNotes.push({ topic: notesTopic, text: notes.trim() });
    }

    setSaving(true);
    const signatureDataUrl = canvas.toDataURL('image/png');
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('pillars_evaluations').insert({
      child_id: selectedChild,
      professional_id: user?.id,
      social,
      motor,
      cognitivo,
      emocional,
      notes_topic: 'MULTIPLE',
      notes: JSON.stringify(finalNotes),
      signature: signatureDataUrl
    });

    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      alert("Avaliação salva com sucesso!");
      // Reset form
      setSocial('');
      setMotor('');
      setCognitivo('');
      setEmocional('');
      setNotesTopic('Geral');
      setNotes('');
      setSavedNotes([]);
      clearCanvas();
    }
  };

  const renderDropdown = (label: string, value: string, setValue: (v: string) => void) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select 
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-full p-3 border border-vaga-gray rounded-xl bg-white focus:ring-2 focus:ring-vaga-blue outline-none"
        required
      >
        <option value="">Selecione...</option>
        <option value="RS">RS - Realiza Sozinho</option>
        <option value="CS">CS - Com Suporte</option>
        <option value="NR">NR - Não realiza</option>
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center gap-4 bg-white shadow-sm border-b border-gray-100 mb-6">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Columns className="text-vaga-blue" size={20} />
            Pilares de Trabalho
          </h2>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md px-4 pb-12">
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Criança</label>
            <select 
              value={selectedChild} 
              onChange={e => setSelectedChild(e.target.value)}
              className="w-full p-3 border border-vaga-gray rounded-xl bg-white focus:ring-2 focus:ring-vaga-blue outline-none"
              required
            >
              <option value="">Selecione uma criança...</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>{child.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-4">
            {renderDropdown('Social', social, setSocial)}
            {renderDropdown('Motor', motor, setMotor)}
            {renderDropdown('Cognitivo', cognitivo, setCognitivo)}
            {renderDropdown('Emocional', emocional, setEmocional)}
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <h4 className="font-bold text-gray-800 text-sm">Anotações Adicionais (opcional)</h4>
            
            {savedNotes.length > 0 && (
              <div className="space-y-2 mb-4">
                {savedNotes.map((note, idx) => (
                  <div key={idx} className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex justify-between gap-2 items-start text-sm text-gray-700">
                    <div>
                      <span className="font-bold text-vaga-blue text-xs uppercase block mb-1">{note.topic}</span>
                      <p>{note.text}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveNote(idx)}
                      className="text-red-400 hover:text-red-600 font-bold px-2 py-1"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tópico da Anotação</label>
                <select 
                  value={notesTopic}
                  onChange={e => setNotesTopic(e.target.value)}
                  className="w-full p-3 border border-vaga-gray rounded-xl bg-white focus:ring-2 focus:ring-vaga-blue outline-none"
                >
                  <option value="Geral">Geral</option>
                  <option value="Social">Social</option>
                  <option value="Motor">Motor</option>
                  <option value="Cognitivo">Cognitivo</option>
                  <option value="Emocional">Emocional</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Anotação</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Detalhes ou observações sobre a avaliação..."
                  className="w-full p-3 border border-vaga-gray rounded-xl bg-white focus:ring-2 focus:ring-vaga-blue outline-none min-h-[80px]"
                />
              </div>
              <button 
                type="button" 
                onClick={handleAddNote}
                className="w-full bg-white border border-vaga-blue text-vaga-blue font-bold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 shadow-sm text-sm"
              >
                + Adicionar Anotação
              </button>
            </div>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mt-4">
            <h4 className="font-bold text-vaga-blue text-sm mb-2">Assinatura do Profissional</h4>
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden touch-none relative">
              <canvas
                ref={canvasRef}
                width={320}
                height={150}
                className="w-full h-[150px] cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
              />
              <button 
                type="button" 
                onClick={clearCanvas}
                className="absolute bottom-2 right-2 bg-gray-100 p-2 rounded-lg text-gray-600 hover:bg-gray-200"
                title="Limpar Assinatura"
              >
                <Eraser size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Assine com o dedo ou mouse neste quadro.</p>
          </div>

          <div className="pt-4">
            <button type="submit" disabled={saving || loading} className="w-full bg-vaga-blue text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 shadow-sm">
              <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 text-center flex justify-center gap-4">
            <span><b>RS:</b> Realiza Sozinho</span>
            <span><b>CS:</b> Com Suporte</span>
            <span><b>NR:</b> Não realiza</span>
          </div>
        </form>
      </main>
    </div>
  );
}
