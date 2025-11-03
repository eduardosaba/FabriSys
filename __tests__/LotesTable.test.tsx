import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LotesTable from '../components/insumos/LotesTable';
import { supabase } from '@/lib/supabase';

// Mock do supabase com encadeamento simples
vi.mock('@/lib/supabase', () => {
  const defaultResult = {
    data: [
      {
        id: '1',
        insumo_id: 'ins1',
        fornecedor_id: 'forn1',
        quantidade_inicial: 100,
        quantidade_restante: 50,
        data_recebimento: '2023-01-01',
        data_validade: '2024-01-01',
        numero_lote: 'L123',
        numero_nota_fiscal: 'NF456',
        fornecedor: { nome: 'Fornecedor Teste' },
        insumo: { nome: 'Insumo Teste' },
      },
    ],
    error: null,
  };

  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => defaultResult),
  };

  return {
    supabase: {
      from: vi.fn(() => chain),
    },
  };
});

describe('LotesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza corretamente com dados', async () => {
    await act(async () => {
      render(<LotesTable insumo_id="ins1" unidade_medida="kg" />);
    });

    expect(screen.getByText('L123')).toBeInTheDocument();
    expect(screen.getByText('Fornecedor Teste')).toBeInTheDocument();
    expect(screen.getByText('NF456')).toBeInTheDocument();
    expect(screen.getByText('100 kg')).toBeInTheDocument();
    expect(screen.getByText('50 kg')).toBeInTheDocument();
  });

  it('exibe mensagem quando não há lotes', async () => {
    vi.mocked(supabase.from).mockImplementationOnce(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        }) as any
    );

    await act(async () => {
      render(
        <LotesTable insumo_id="ins1" unidade_medida="kg" emptyMessage="Nenhum lote encontrado" />
      );
    });

    expect(screen.getByText('Nenhum lote encontrado')).toBeInTheDocument();
  });

  it('chama callbacks de edição e deleção', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    await act(async () => {
      render(
        <LotesTable insumo_id="ins1" unidade_medida="kg" onEdit={onEdit} onDelete={onDelete} />
      );
    });

    fireEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Excluir'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('destaca lotes vencidos e sem estoque', async () => {
    vi.mocked(supabase.from).mockImplementationOnce(
      () =>
        ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [
                  {
                    id: '1',
                    insumo_id: 'ins1',
                    fornecedor_id: 'forn1',
                    quantidade_inicial: 100,
                    quantidade_restante: 0,
                    data_recebimento: '2023-01-01',
                    data_validade: '2023-01-01', // Data vencida
                    numero_lote: 'L123',
                    numero_nota_fiscal: 'NF456',
                    fornecedor: { nome: 'Fornecedor Teste' },
                    insumo: { nome: 'Insumo Teste' },
                  },
                ],
                error: null,
              })),
            })),
          })),
        }) as any
    );

    await act(async () => {
      render(
        <LotesTable insumo_id="ins1" unidade_medida="kg" highlightVencidos highlightSemEstoque />
      );
    });

    const row = screen.getByText('L123').closest('tr');
    expect(row).toHaveClass('bg-red-50');
  });
});
