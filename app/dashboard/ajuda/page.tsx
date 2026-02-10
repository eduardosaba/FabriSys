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
    { id: 'fluxo-diario', label: '2. Fluxo Diário', icon: Calendar },
    { id: 'producao', label: '3. Na Cozinha (Kanban)', icon: ChefHat },
    { id: 'compras', label: '4. Compras & Estoque', icon: ShoppingCart },
    { id: 'pdv', label: '5. PDV (Caixa)', icon: Calculator },
    { id: 'meta-fidelidade', label: '6. Meta & Clube Fidelidade', icon: Gift },
    { id: 'avisos', label: '7. Avisos Administrativos', icon: Bell },
    { id: 'ferramentas-pdv', label: '8. Ferramentas PDV', icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto animate-fade-up">
      <PageHeader
        title="Central de Ajuda Confectio"
        description="Manuais passo a passo para operar o sistema da fábrica."
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
                Configuração Inicial (Engenharia)
              </h2>
              <p className="text-slate-600">
                Para que o sistema calcule quantas panelas fazer automaticamente, ele precisa
                aprender sobre os seus produtos. Isso é feito apenas uma vez.
              </p>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <Package size={18} /> Passo 1: Cadastrar o Produto Final
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Vá em <strong>Produção &gt; Produtos Finais</strong>.
                  </p>
                  <ul className="list-disc list-inside text-sm text-slate-700 mt-2 ml-2 space-y-1">
                    <li>
                      Nome: <strong>Brigadeiro Tradicional</strong>
                    </li>
                    <li>Preço de Venda: R$ 3,50</li>
                    <li className="font-bold text-pink-600">Peso Unitário: 20g (Fundamental!)</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-2 italic">
                    * Sem o peso unitário, o sistema não sabe calcular a massa total.
                  </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <h3 className="font-bold text-orange-800 flex items-center gap-2">
                    <ChefHat size={18} /> Passo 2: Criar a Ficha Técnica
                  </h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Vá em <strong>Produção &gt; Fichas Técnicas</strong> e vincule ao produto.
                  </p>
                  <ul className="list-disc list-inside text-sm text-slate-700 mt-2 ml-2 space-y-1">
                    <li>Adicione os ingredientes (Leite Condensado, Chocolate, etc).</li>
                    <li className="font-bold text-pink-600">Peso Final da Receita (Massa): 450g</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-2 italic">
                    * Informe quanto pesa a massa DEPOIS de sair do fogo. É esse número que define o
                    rendimento da panela.
                  </p>
                </div>
              </div>
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
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div> 1. A Fazer
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

                <div className="border p-4 rounded-lg hover:bg-slate-50 border-green-200 bg-green-50/30">
                  <h4 className="font-bold text-green-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div> 5. Expedição 📦
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Aqui você gera o <strong>Romaneio</strong> (Etiqueta) que diz: &quot;100 para
                    Shopping, 50 para Centro&quot;.
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
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                MRP: Sugestão de Compras
              </h2>
              <p className="text-slate-600">
                Não compre &quot;no chute&quot;. O sistema diz exatamente o que você precisa baseado
                no planejamento.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="bg-pink-100 p-3 rounded-full text-pink-600">
                    <ArrowRight size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">1. Planeje Primeiro</h3>
                    <p className="text-sm text-slate-500">
                      Faça o planejamento da semana na tela de Planejamento.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="bg-pink-100 p-3 rounded-full text-pink-600">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">2. Consulte a Sugestão</h3>
                    <p className="text-sm text-slate-500">
                      Vá em <strong>Suprimentos &gt; Sugestão de Compras</strong>. O sistema vai
                      listar tudo o que vai faltar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="bg-pink-100 p-3 rounded-full text-pink-600">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">3. Copie a Lista</h3>
                    <p className="text-sm text-slate-500">
                      Use o botão <strong>Copiar Lista</strong> para mandar direto no WhatsApp do
                      fornecedor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: PDV (Caixa) */}
          {activeTab === 'pdv' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">PDV (Caixa)</h2>
              <p className="text-slate-600">
                O PDV suporta dois modos: <strong>Padrão</strong> (baixa estoque por venda) e
                <strong> Inventário/Fechamento</strong> (consolida em fechamento). Escolha o modo no
                canto superior do PDV.
              </p>

              <div className="bg-slate-50 p-4 rounded border border-slate-100">
                <h3 className="font-bold text-slate-800">Como funciona a baixa de estoque</h3>
                <p className="text-sm text-slate-600 mt-1">
                  As vendas no PDV acionam uma função atômica no banco que decrementa o estoque por
                  item. Se houver erro, verifique se a loja está com a configuração correta e se as
                  migrations do banco foram aplicadas.
                </p>
                <p className="text-xs text-slate-500 mt-2 italic">
                  Dica: use o relatório de itens vendidos para reconciliar diferenças.
                </p>
              </div>
            </div>
          )}

          {/* ABA 6: META DO DIA & CLUBE FIDELIDADE */}
          {activeTab === 'meta-fidelidade' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Meta do Dia & Clube
              </h2>
              <p className="text-slate-600">
                Use <strong>Meta do Dia</strong> para definir objetivos de vendas por PDV e motivar
                a equipe. O <strong>Clube Fidelidade</strong> acumula pontos automaticamente para
                clientes cadastrados.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-pink-50">
                  <h4 className="font-bold text-pink-700">Configurar Meta do Dia</h4>
                  <p className="text-sm text-pink-700 mt-1">
                    Vá em Dashboard → Metas e adicione metas diárias por PDV.
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-green-50">
                  <h4 className="font-bold text-green-700">Clube Fidelidade</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Ative o programa em Clientes → Fidelidade e veja os pontos no cadastro do
                    cliente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 7: AVISOS ADMINISTRATIVOS */}
          {activeTab === 'avisos' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Avisos Administrativos
              </h2>
              <p className="text-slate-600">
                Administradores podem criar avisos que aparecem como popup para todos os usuários.
                Os avisos podem ser marcados como lidos e serão ocultados para quem já visualizou.
              </p>

              <div className="p-4 border rounded-lg bg-yellow-50">
                <h4 className="font-bold text-yellow-800">Onde criar</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Acesse Admin → Avisos. Defina título, mensagem e período de validade.
                </p>
              </div>
            </div>
          )}

          {/* ABA 8: FERRAMENTAS PDV (Calculadora, Reposição) */}
          {activeTab === 'ferramentas-pdv' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 border-b pb-2">
                Ferramentas do PDV
              </h2>
              <p className="text-slate-600">
                Pequenas ferramentas ajudam no dia a dia do caixa e agilizam vendas.
              </p>

              <div className="space-y-3">
                <div className="p-4 border rounded-lg bg-white">
                  <h4 className="font-bold">Calculadora Flutuante</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Use a calculadora para montar descontos rápidos e calcular troco — ela fica
                    sobreposta ao PDV.
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-white">
                  <h4 className="font-bold">Solicitação de Reposição</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Se um produto acabar no PDV, crie uma solicitação de reposição que vai para o
                    painel de compras/estoque.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
