'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import PageHeader from '@/components/ui/PageHeader';
import { Settings, Sliders, Palette } from 'lucide-react';

// Importação dos componentes das abas
import CustomizacaoTab from './CustomizacaoTab';
import SistemaTab from './SistemaTab';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'sistema' | 'customizacao'>('sistema');

  return (
    <div className="container space-y-6 py-6 animate-fade-up">
      <PageHeader
        title="Configurações"
        description="Gerencie as regras de negócio e a identidade visual do Confectio."
        icon={Settings}
      />

      <div className="flex gap-4 border-b border-slate-200 pb-0">
        <button
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'sistema'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('sistema')}
        >
          <Sliders size={18} />
          Regras do Sistema
        </button>
        <button
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'customizacao'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('customizacao')}
        >
          <Palette size={18} />
          Aparência & Tema
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'customizacao' && <CustomizacaoTab />}
        {activeTab === 'sistema' && <SistemaTab />}
      </div>
    </div>
  );
}
