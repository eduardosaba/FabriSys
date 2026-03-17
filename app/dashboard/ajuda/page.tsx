'use client';

import { useState } from 'react';
// ATENÇÃO: Descomente a linha abaixo no seu projeto real e remova o mock no final deste arquivo
import PageHeader from '@/components/ui/PageHeader';

import {
  BookOpen,
  Package,
  Calendar,
  ChefHat,
  ShoppingCart,
  Star,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Bell,
  Gift,
  Calculator,
  MessageSquare,
} from 'lucide-react';

export default function AjudaPage() {
  const [activeTab, setActiveTab] = useState('primeiros-passos');
  const tabs = [
    { id: 'primeiros-passos', label: '1. Primeiros Passos', icon: BookOpen },
    { id: 'planejamento', label: '2. Planejamento (MRP)', icon: Calendar },
    { id: 'kanban', label: '3. Produção (Kanban)', icon: ChefHat },
    { id: 'compras', label: '4. Compras & Estoque', icon: ShoppingCart },
    { id: 'pdv', label: '5. PDV (Caixa)', icon: Calculator },
    { id: 'meta-fidelidade', label: '6. Meta & Clube Fidelidade', icon: Gift },
    { id: 'avisos', label: '7. Avisos Administrativos', icon: Bell },
    { id: 'favoritos', label: '8. Favoritos & Atalhos', icon: Star },
    { id: 'ferramentas-pdv', label: '9. Ferramentas PDV', icon: MessageSquare },
    { id: 'notificacoes', label: '10. Notificações', icon: Bell },
    { id: 'ajuda-geral', label: '11. Ajuda Geral', icon: BookOpen },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto animate-fade-up">
      <PageHeader
        title="Central de Ajuda"
        description="Manuais passo a passo para operar o sistema: planejamento, kanban, PDV, compras e funções administrativas."
        icon={BookOpen}
      />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Menu Lateral de Tópicos */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left
                  ${
                    activeTab === tab.id
                      ? 'bg-pink-50 text-pink-700 border border-pink-200 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-[500px]">
          {/* ABA 1: CADASTRO E ENGENHARIA */}
          {activeTab === 'primeiros-passos' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Configuração Inicial
              </h2>
              <p className="text-slate-600">Checklist mínimo para começar a operar:</p>
              <ol className="list-decimal list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Cadastre Produtos Finais: nome, preço, peso unitário (g). Caminho:{' '}
                  <strong>Produção &gt; Produtos Finais</strong>.
                </li>
                <li>
                  Crie Fichas Técnicas (receitas) com ingredientes e informe o{' '}
                  <strong>peso final da receita</strong> (massa pronta).
                </li>
                <li>Configure Unidades e PDVs: cadastre pontos de venda e estoques associados.</li>
                <li>
                  Permissões iniciais: crie roles e verifique se sua organização tem configurações
                  em <strong>Configurações</strong>.
                </li>
                <li>
                  Teste fluxo com um pedido fictício para validar cálculos de rendimento e estoque.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'planejamento' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Planejamento (MRP)
              </h2>
              <p className="text-slate-600">
                Use o módulo de Planejamento para definir vendas previstas e gerar sugestões de
                compras.
              </p>
              <h3 className="font-semibold">Como usar</h3>
              <ol className="list-decimal list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Abra <strong>Planejamento</strong> e adicione suas previsões por PDV.
                </li>
                <li>
                  Revise quantidades por produto; o sistema converte para massa e calcula panelas
                  necessárias.
                </li>
                <li>
                  Gere relatório MRP para obter sugestão de compras — exportável e copiável para
                  fornecedores.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">Produção — Kanban</h2>
              <p className="text-slate-600">Termos usados no quadro Kanban e como operá-lo.</p>
              <h3 className="font-semibold">Colunas e significados</h3>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  <strong>Backlog / Planejado</strong>: Ordens planejadas aguardando liberação.
                </li>
                <li>
                  <strong>Pronto / To Do</strong>: Ordens prontas para iniciar no turno.
                </li>
                <li>
                  <strong>Em Produção / In Progress</strong>: Ordens em preparo (no fogão).
                </li>
                <li>
                  <strong>Em Espera / QA</strong>: Ordens aguardando conferência ou ajuste.
                </li>
                <li>
                  <strong>Finalizado / Done</strong>: Ordens concluídas e prontas para expedição.
                </li>
              </ul>
              <h3 className="font-semibold">Boas práticas</h3>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Ao clicar em <strong>Iniciar</strong>, o sistema consome ingredientes do estoque.
                </li>
                <li>
                  Se faltar insumo, crie uma solicitação de reposição imediatamente (link direto
                  disponível no PDV/kanban).
                </li>
                <li>Use etiquetas de romaneio para separar destinos (Shopping, Centro, etc.).</li>
              </ul>
            </div>
          )}

          {/* ABA 2: PLANEJAMENTO DIÁRIO */}
          {activeTab === 'fluxo-diario' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Rotina de Planejamento
              </h2>
              <p className="text-slate-600">
                Todos os dias (ou semanalmente), a administração define o que será enviado para os
                PDVs.
              </p>

              <div className="relative border-l-2 border-pink-200 pl-6 ml-2 space-y-8">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 h-6 w-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <h3 className="font-bold text-slate-800">Definir Quantidades</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Acesse <strong>Planejamento</strong>. Você verá uma tabela com seus produtos e
                    colunas para cada PDV (Centro, Shopping, etc). Digite a quantidade que cada loja
                    precisa.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 h-6 w-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <h3 className="font-bold text-slate-800">O Cálculo Mágico</h3>
                  <div className="text-sm text-slate-600 mt-1">
                    O sistema vai somar tudo (ex: 100 + 50 = 150 doces) e converter em panelas:
                    <br />
                    <code className="bg-slate-100 px-1 rounded text-xs mt-1 inline-block">
                      150 doces x 20g = 3.000g de massa
                    </code>
                    <br />
                    <code className="bg-slate-100 px-1 rounded text-xs mt-1 inline-block">
                      3.000g / 450g (panela) = 6,66 -&gt; 7 Panelas
                    </code>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 h-6 w-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <h3 className="font-bold text-slate-800">Gerar Ordens</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Ao clicar em <strong>Salvar</strong>, o sistema cria os cartões de trabalho para
                    a cozinha.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: PRODUÇÃO E KANBAN */}
          {activeTab === 'producao' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Chão de Fábrica (Kanban)
              </h2>
              <p className="text-slate-600">
                O tablet na cozinha mostra o quadro de trabalho. A equipe deve mover os cartões
                conforme o progresso.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="border p-4 rounded-lg hover:bg-slate-50">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div> 1. A Fazer / OP
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Ordens planejadas aguardando início.
                  </p>
                </div>

                <div className="border p-4 rounded-lg hover:bg-slate-50 border-orange-200 bg-orange-50/30">
                  <h4 className="font-bold text-orange-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div> 2. No Fogão 🔥
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Ao clicar em <strong>Iniciar</strong>, o sistema{' '}
                    <strong className="text-red-600">baixa o estoque</strong> dos ingredientes
                    automaticamente.
                  </p>
                </div>

                <div className="border p-4 rounded-lg hover:bg-slate-50 border-blue-200 bg-blue-50/30">
                  <h4 className="font-bold text-blue-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div> 3. Descanso ❄️
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Massa pronta esfriando. Aguardando equipe de mesa.
                  </p>
                </div>

                <div className="border p-4 rounded-lg hover:bg-slate-50 border-pink-200 bg-pink-50/30">
                  <h4 className="font-bold text-pink-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500"></div> 4. ✨ Confeitagem 🍬
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Etapa de finalização visual e decoração dos produtos.
                  </p>
                </div>

                <div className="border p-4 rounded-lg hover:bg-slate-50 border-green-200 bg-green-50/30">
                  <h4 className="font-bold text-green-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div> 5. ✅ Concluído 🚚
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Ordens concluídas e prontas para expedição.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded border border-yellow-200 flex gap-3 items-start">
                <AlertTriangle className="text-yellow-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-yellow-800 text-sm">
                    Atenção: Estoque Insuficiente
                  </h4>
                  <p className="text-xs text-yellow-700 mt-1">
                    Se ao clicar em &quot;Iniciar&quot; o sistema der erro, é porque falta
                    ingrediente no estoque virtual. Dê entrada na nota fiscal em{' '}
                    <strong>Suprimentos &gt; Entrada de Notas</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: COMPRAS */}
          {activeTab === 'compras' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">Compras & Estoque</h2>
              <p className="text-slate-600">Como gerar e usar a sugestão de compras (MRP).</p>
              <ol className="list-decimal list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Abra <strong>Suprimentos &gt; Sugestão de Compras</strong> para ver itens
                  faltantes.
                </li>
                <li>Filtre por centro de custo, fornecedor ou prioridade.</li>
                <li>Exporte ou copie a lista para comunicação com fornecedores.</li>
              </ol>
            </div>
          )}

          {/* ABA 5: PDV (Caixa) */}
          {activeTab === 'pdv' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">PDV (Caixa)</h2>
              <p className="text-slate-600">Operação do PDV e modos de funcionamento.</p>
              <h3 className="font-semibold">Modos</h3>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  <strong>Padrão</strong>: baixa estoque automaticamente por venda.
                </li>
                <li>
                  <strong>Inventário/Fechamento</strong>: consolida movimentos ao fechar turno.
                </li>
              </ul>
              <h3 className="font-semibold">Dicas</h3>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>Verifique configurações de PDV por loja para evitar diferenças na contagem.</li>
                <li>Use relatórios de vendas para conciliar vendas e estoque.</li>
              </ul>
            </div>
          )}

          {/* ABA 6: META DO DIA & CLUBE FIDELIDADE */}
          {activeTab === 'meta-fidelidade' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Meta do Dia & Fidelidade
              </h2>
              <p className="text-slate-600">Como definir metas e utilizar o clube de fidelidade.</p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Defina metas por PDV em <strong>Dashboard → Metas</strong>.
                </li>
                <li>
                  Ative o Clube Fidelidade em <strong>Clientes → Fidelidade</strong> para acumular
                  pontos.
                </li>
              </ul>
            </div>
          )}

          {/* ABA 7: AVISOS ADMINISTRATIVOS */}
          {activeTab === 'avisos' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Avisos Administrativos
              </h2>
              <p className="text-slate-600">Como criar e gerenciar avisos globais para usuários.</p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Crie avisos em <strong>Admin → Avisos</strong> com período de validade.
                </li>
                <li>Usuários podem marcar como lido; avisos lidos são ocultados por usuário.</li>
              </ul>
            </div>
          )}

          {activeTab === 'favoritos' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Favoritos & Atalhos
              </h2>
              <p className="text-slate-600">
                Fixe páginas importantes para acesso rápido no Sidebar e no Header.
              </p>
              <ol className="list-decimal list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Use o ícone de estrela ao lado dos itens do menu para Fixar/Desfixar uma página.
                </li>
                <li>
                  Páginas fixadas aparecem na área de Favoritos do Sidebar e no Header — facilite
                  acessos frequentes.
                </li>
                <li>
                  Gerencie preferências em <strong>Configurações → Atalhos</strong> (se disponível).
                </li>
              </ol>
            </div>
          )}

          {/* ABA 8: FERRAMENTAS PDV (Calculadora, Reposição) */}
          {activeTab === 'ferramentas-pdv' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">Ferramentas PDV</h2>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>Calculadora flutuante para descontos e troco.</li>
                <li>Solicitação de reposição integrada ao painel de compras.</li>
                <li>Atalhos rápidos para fechar turno e imprimir relatórios de vendas.</li>
              </ul>
            </div>
          )}

          {activeTab === 'notificacoes' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">Notificações</h2>
              <p className="text-slate-600">
                Como funcionam alertas e assinaturas dentro do sistema.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Notificações em tempo real para eventos críticos (ex: falta de estoque, ordens com
                  erro).
                </li>
                <li>
                  Assine relatórios e recibos para receber atualizações por e-mail (quando
                  configurado).
                </li>
                <li>
                  Controle visibilidade e preferências em{' '}
                  <strong>Configurações → Notificações</strong>.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'ajuda-geral' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">Ajuda Geral</h2>
              <p className="text-slate-600">Recursos adicionais e contato de suporte.</p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-sm text-slate-700">
                <li>
                  Documentação técnica: consulte a pasta <strong>/docs</strong> no repositório.
                </li>
                <li>
                  Para problemas de permissão ou erros 403/42703, valide a coluna de organizações
                  (use <strong>nome</strong> em seleções).
                </li>
                <li>
                  Se precisar, abra uma issue interna com logs de erro e passos para reproduzir.
                </li>
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
