'use client';

import { useState } from 'react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    inviteCode: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    
    setLoading(true);

    try {
      // 1. Validar convite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('code', formData.inviteCode.toUpperCase())
        .eq('used', false)
        .maybeSingle();

      if (inviteError || !invite) {
        console.error("Invite Error:", inviteError);
        setError("O código de convite digitado não existe, expirou ou já foi utilizado.");
        setLoading(false);
        return;
      }

      // 2. Criar conta
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            role: 'GUARDIAN'
          }
        }
      });

      if (authError) throw authError;

      // 3. Atualizar convite
      if (authData.user) {
        await supabase
          .from('invites')
          .update({ used: true, used_by: authData.user.id })
          .eq('id', invite.id);
        
        alert("Cadastro realizado com sucesso!");
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro no cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-vaga-gray">
        
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Criar Cadastro</h1>
          <p className="text-sm text-gray-500 mt-1">Insira seus dados e o código de convite</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input 
              name="name" type="text" required value={formData.name} onChange={handleChange}
              className="w-full p-2.5 border border-vaga-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-vaga-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input 
              name="email" type="email" required value={formData.email} onChange={handleChange}
              className="w-full p-2.5 border border-vaga-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-vaga-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input 
              name="phone" type="tel" required value={formData.phone} onChange={handleChange}
              className="w-full p-2.5 border border-vaga-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-vaga-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input 
                name="password" type="password" required value={formData.password} onChange={handleChange}
                className="w-full p-2.5 border border-vaga-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-vaga-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmação</label>
              <input 
                name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange}
                className="w-full p-2.5 border border-vaga-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-vaga-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de Convite</label>
            <input 
              name="inviteCode" type="text" required value={formData.inviteCode} onChange={handleChange}
              placeholder="Ex: VAGA-1234"
              className="w-full p-2.5 border border-vaga-yellow bg-yellow-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-vaga-yellow uppercase font-mono text-center tracking-widest"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-vaga-blue text-gray-800 font-bold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Concluir Cadastro'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-gray-500 hover:underline">
            Já tem uma conta? <span className="text-vaga-pink font-semibold">Entrar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
