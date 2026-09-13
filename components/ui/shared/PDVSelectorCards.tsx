'use client';

import React, { useState } from 'react';
import { Store, CheckCircle2 } from 'lucide-react';

export interface LocalPDV {
  id: string;
  nome: string;
  tipo?: string; // Ex: 'quiosque', 'loja', 'evento'
  logo_url?: string;
}

export interface PDVSelectorCardsProps {
  locais: LocalPDV[];
  selectedId: string;
  onSelect: (id: string) => void;
  carregando?: boolean;
  incluirTodos?: boolean;
  todosLabel?: string;
}

export interface PDVSelectorChipsProps {
  locais: LocalPDV[];
  selectedId: string;
  onSelect: (id: string) => void;
  todosLabel?: string;
  carregando?: boolean;
}

function PDVCardItem({
  pdv,
  isSelected,
  onSelect,
}: {
  pdv: LocalPDV;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const hasLogo = Boolean(pdv.logo_url) && !imgError;

  return (
    <button
      type="button"
      onClick={() => onSelect(pdv.id)}
      title={pdv.nome}
      className={`group relative flex flex-col justify-between aspect-square w-full rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-200 active:scale-[0.98] min-w-0 overflow-hidden ${
        isSelected
          ? 'border-primary shadow-md shadow-primary/20 ring-2 ring-primary/40 font-bold'
          : 'border-primary/15 bg-background hover:border-primary/40 hover:shadow-sm'
      }`}
    >
      {/* Imagem de Fundo (Preenche todo o Card Quadrado sem textos por cima) */}
      {hasLogo && (
        <img
          src={pdv.logo_url}
          alt={pdv.nome}
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover z-0 transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Topo: Ícone Fallback & Indicador de Seleção */}
      <div className="relative z-10 flex w-full items-center justify-between">
        {!hasLogo ? (
          <div
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-colors shrink-0 overflow-hidden border ${
              isSelected
                ? 'border-primary/40 bg-primary text-white shadow-sm'
                : 'border-primary/15 bg-primary/10 text-primary group-hover:bg-primary/20'
            }`}
          >
            <Store className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        ) : (
          <div />
        )}

        {isSelected && (
          <CheckCircle2
            className={`h-5 w-5 transition-all animate-in fade-in zoom-in-75 duration-150 shrink-0 ${
              hasLogo
                ? 'text-emerald-400 bg-slate-900/60 rounded-full p-0.5 border border-white/30 drop-shadow-md'
                : 'text-primary'
            }`}
          />
        )}
      </div>

      {/* Rodapé: Nome e Tipo do PDV (Exibido somente quando NÃO tiver logo) */}
      {!hasLogo && (
        <div className="relative z-10 mt-3 sm:mt-4 w-full min-w-0">
          <p
            className={`text-xs sm:text-sm font-bold tracking-tight transition-colors truncate w-full ${
              isSelected ? 'text-primary' : 'text-text/80 group-hover:text-text'
            }`}
            title={pdv.nome}
          >
            {pdv.nome}
          </p>
          <span className="text-[10px] sm:text-[11px] font-medium text-text/50 capitalize truncate block w-full">
            {pdv.tipo || 'Ponto de Venda'}
          </span>
        </div>
      )}
    </button>
  );
}

function TodosPDVCardItem({
  selectedId,
  onSelect,
  todosLabel,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  todosLabel: string;
}) {
  const [imgError, setImgError] = useState(false);
  const isSelected = selectedId === 'todos' || selectedId === '';
  const hasLogo = !imgError;

  return (
    <button
      type="button"
      onClick={() => onSelect('todos')}
      title={todosLabel}
      className={`group relative flex flex-col justify-between aspect-square w-full rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-200 active:scale-[0.98] min-w-0 overflow-hidden ${
        isSelected
          ? 'border-primary shadow-md shadow-primary/20 ring-2 ring-primary/40 font-bold'
          : 'border-primary/15 bg-background hover:border-primary/40 hover:shadow-sm'
      }`}
    >
      {/* Imagem de Fundo (Preenche todo o Card Quadrado sem textos por cima) */}
      {hasLogo && (
        <img
          src="/todospontosdevendas.png"
          alt={todosLabel}
          onError={() => setImgError(true)}
          className="absolute inset-0 h-full w-full object-cover z-0 transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Topo: Ícone Fallback & Indicador de Seleção */}
      <div className="relative z-10 flex w-full items-center justify-between">
        {!hasLogo ? (
          <div
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition-colors shrink-0 overflow-hidden border ${
              isSelected
                ? 'border-primary/40 bg-primary text-white shadow-sm'
                : 'border-primary/15 bg-primary/10 text-primary group-hover:bg-primary/20'
            }`}
          >
            <Store className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        ) : (
          <div />
        )}

        {isSelected && (
          <CheckCircle2
            className={`h-5 w-5 transition-all animate-in fade-in zoom-in-75 duration-150 shrink-0 ${
              hasLogo
                ? 'text-emerald-400 bg-slate-900/60 rounded-full p-0.5 border border-white/30 drop-shadow-md'
                : 'text-primary'
            }`}
          />
        )}
      </div>

      {/* Rodapé: Exibido apenas no Fallback caso a imagem não carregue */}
      {!hasLogo && (
        <div className="relative z-10 mt-3 sm:mt-4 w-full min-w-0">
          <p
            className={`text-xs sm:text-sm font-bold tracking-tight transition-colors truncate w-full ${
              isSelected ? 'text-primary' : 'text-text/80 group-hover:text-text'
            }`}
            title={todosLabel}
          >
            {todosLabel}
          </p>
          <span className="text-[10px] sm:text-[11px] font-medium text-text/50 capitalize truncate block w-full">
            Visão Geral
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * Grid Seletor por Cards Clicáveis Quadrados
 * Ideal para formulários de lançamento (ex: Lançamento de Romaneio no PDV, Fechamento e Auditoria)
 */
export function PDVSelectorCards({
  locais,
  selectedId,
  onSelect,
  carregando = false,
  incluirTodos = false,
  todosLabel = 'Todos os PDVs',
}: PDVSelectorCardsProps) {
  if (carregando) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 w-full max-w-full min-w-0">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="aspect-square w-full animate-pulse rounded-2xl border border-primary/10 bg-primary/5 p-3 sm:p-4"
          />
        ))}
      </div>
    );
  }

  if (locais.length === 0 && !incluirTodos) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4 text-center text-xs text-text/50 w-full">
        Nenhum ponto de venda (PDV) cadastrado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 w-full max-w-full min-w-0">
      {incluirTodos && (
        <TodosPDVCardItem
          selectedId={selectedId}
          onSelect={onSelect}
          todosLabel={todosLabel}
        />
      )}

      {locais.map((pdv) => (
        <PDVCardItem
          key={pdv.id}
          pdv={pdv}
          isSelected={selectedId === pdv.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function PDVChipItem({
  pdv,
  isSelected,
  onSelect,
}: {
  pdv: LocalPDV;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const hasLogo = Boolean(pdv.logo_url) && !imgError;

  return (
    <button
      type="button"
      onClick={() => onSelect(pdv.id)}
      title={pdv.nome}
      className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shrink-0 snap-start ${
        isSelected
          ? 'bg-primary text-white shadow-sm'
          : 'border border-primary/20 bg-background text-text/70 hover:border-primary/40 hover:bg-primary/[0.03]'
      }`}
    >
      {hasLogo ? (
        <img
          src={pdv.logo_url}
          alt={pdv.nome}
          onError={() => setImgError(true)}
          className="h-5 w-5 rounded-full object-cover shrink-0 border border-white/40 shadow-xs"
        />
      ) : (
        <Store className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>{pdv.nome}</span>
    </button>
  );
}

/**
 * Barra Horizontal de Chips/Tabs Deslizáveis
 * Ideal para Filtros Rápido de Dashboard & Auditoria
 */
export function PDVSelectorChips({
  locais,
  selectedId,
  onSelect,
  todosLabel = 'Todos os PDVs',
  carregando = false,
}: PDVSelectorChipsProps) {
  if (carregando) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full min-w-0 w-full scrollbar-none">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 animate-pulse rounded-xl bg-primary/5 shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full min-w-0 w-full scrollbar-none snap-x">
      {/* Opção Todos os PDVs */}
      <button
        type="button"
        onClick={() => onSelect('todos')}
        title={todosLabel}
        className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shrink-0 snap-start ${
          selectedId === 'todos' || selectedId === ''
            ? 'bg-primary text-white shadow-sm'
            : 'border border-primary/20 bg-background text-text/70 hover:border-primary/40'
        }`}
      >
        <img
          src="/todospontosdevendas.png"
          alt={todosLabel}
          className="h-5 w-5 rounded-full object-cover shrink-0 border border-white/40 shadow-xs"
        />
        <span>{todosLabel}</span>
      </button>

      {/* Cards/Chips dos PDVs individuais */}
      {locais.map((pdv) => (
        <PDVChipItem
          key={pdv.id}
          pdv={pdv}
          isSelected={selectedId === pdv.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
