'use client';

import { useState } from 'react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-vaga-gray">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-48 mb-2">
            <img src="/logo.png" alt="Vaga-lume Logo" className="w-full h-auto drop-shadow-sm" />
          </div>
          <p className="text-gray-500 font-medium">Acesse a conta do seu bebê</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail ou Usuário</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 border border-vaga-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-vaga-blue"
              placeholder="Digite seu e-mail"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-vaga-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-vaga-blue"
              placeholder="Sua senha"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit"
              className="w-full bg-vaga-pink text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
            >
              Entrar
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-col space-y-3 text-center text-sm">
          <Link href="/register" className="text-vaga-blue font-semibold hover:underline">
            Criar cadastro
          </Link>
          <a href="#" className="text-gray-500 hover:underline">
            Esqueci minha senha
          </a>
        </div>
      </div>
    </div>
  );
}
