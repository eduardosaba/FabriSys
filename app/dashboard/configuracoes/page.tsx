'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Settings, Sliders, Palette, Shield, Users } from 'lucide-react';

// Importação dos componentes das abas
import CustomizacaoTab from './CustomizacaoTab';
import SistemaTab from './SistemaTab';
import PermissoesTab from './PermissoesTab';
import UsuariosPage from './usuarios/page'; // Importa a página de usuários como componente

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<
    'sistema' | 'customizacao' | 'permissoes' | 'usuarios'
  >('usuarios');

  return (
    <div className="container space-y-4 md:space-y-6 py-4 md:py-6 animate-fade-up max-h-[calc(100vh-6rem)] overflow-auto px-3 md:px-0">
      <PageHeader
        title="Configurações"
        description="Gerencie as regras de negócio, acessos e a identidade visual do Confectio."
        icon={Settings}
      />

      <div className="flex flex-wrap gap-2 md:gap-4 border-b border-slate-200 pb-0 overflow-x-auto">
        <button
          className={`flex items-center gap-2 pb-3 px-2 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'usuarios'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users size={18} />
          <span className="hidden sm:inline">Equipe & Usuários</span>
          <span className="sm:hidden">Equipe</span>
        </button>

        <button
          className={`flex items-center gap-2 pb-3 px-2 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'sistema'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('sistema')}
        >
          <Sliders size={18} />
          <span className="hidden sm:inline">Regras do Sistema</span>
          <span className="sm:hidden">Sistema</span>
        </button>

        <button
          className={`flex items-center gap-2 pb-3 px-2 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'permissoes'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('permissoes')}
        >
          <Shield size={18} />
          Permissões
        </button>

        <button
          className={`flex items-center gap-2 pb-3 px-2 text-xs md:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'customizacao'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('customizacao')}
        >
          <Palette size={18} />
          <span className="hidden sm:inline">Aparência & Tema</span>
          <span className="sm:hidden">Tema</span>
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'usuarios' && <UsuariosPage />}
        {activeTab === 'sistema' && <SistemaTab />}
        {activeTab === 'permissoes' && <PermissoesTab />}
        {activeTab === 'customizacao' && <CustomizacaoTab />}
      </div>
    </div>
  );
}
