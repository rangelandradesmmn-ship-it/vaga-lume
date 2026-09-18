'use client';

import Link from 'next/link';
import { ArrowLeft, HardHat } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center">
      <header className="w-full max-w-md pt-8 pb-4 px-6 flex items-center gap-4 bg-white shadow-sm border-b border-gray-100 mb-6">
        <Link href="/" className="text-gray-500 hover:text-vaga-pink">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-800">
            Página em Construção
          </h2>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md px-4 flex flex-col items-center justify-center pb-20">
        <div className="bg-yellow-50 p-8 rounded-full mb-6 text-vaga-yellow">
          <HardHat size={64} strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">Em breve!</h3>
        <p className="text-gray-500 text-center px-4">
          Esta funcionalidade ainda está sendo desenvolvida e estará disponível nas próximas atualizações do aplicativo.
        </p>
        <Link href="/" className="mt-8 px-6 py-3 bg-vaga-blue text-white font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity">
          Voltar para o Início
        </Link>
      </main>
    </div>
  );
}
