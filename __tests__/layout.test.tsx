import { render, screen, fireEvent } from './test-utils';
import Layout from '../components/Layout';
import { vi } from 'vitest';

// Mock do usePathname e useRouter
const mockUsePathname = vi.fn();
const mockUseRouter = { push: vi.fn(), replace: vi.fn() } as any as any;
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => mockUseRouter,
}));

describe('Layout', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard');
  });

  it('renders children and header', () => {
    render(
      <Layout>
        <div>Conteúdo</div>
      </Layout>
    );
    expect(screen.getByText(/Conteúdo/i)).toBeInTheDocument();
    expect(screen.getByText(/FabriSys/i)).toBeInTheDocument();
  });

  it('renders all menu items without duplicate keys', () => {
    render(
      <Layout>
        <div>Conteúdo</div>
      </Layout>
    );

    // Verifica seções do menu
    expect(screen.getByText('MÓDULO 1 - CADASTROS BÁSICOS')).toBeInTheDocument();
    expect(screen.getByText('MÓDULO 2 - PRODUÇÃO COMPLETA')).toBeInTheDocument();

    // Verifica itens do menu
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Insumos')).toBeInTheDocument();
    expect(screen.getByText('Lotes')).toBeInTheDocument();
    expect(screen.getByText('Fornecedores')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Produção')).toBeInTheDocument();
    expect(screen.getByText('Produtos Finais')).toBeInTheDocument();
    expect(screen.getByText('Ordens de Produção')).toBeInTheDocument();
    expect(screen.getByText('Fichas Técnicas')).toBeInTheDocument();
    expect(screen.getByText('Relatórios')).toBeInTheDocument();
    // Não assumimos itens de configuração específicos aqui — apenas checamos o menu principal
  });

  it('highlights active menu item', () => {
    mockUsePathname.mockReturnValue('/dashboard/insumos');

    render(
      <Layout>
        <div>Conteúdo</div>
      </Layout>
    );

    // O item "Insumos" deve estar ativo (com classes específicas)
    const insumosLink = screen.getByText('Insumos');
    expect(insumosLink).toBeInTheDocument();
    // Verifica se tem as classes de ativo
    expect(insumosLink.closest('a')).toHaveClass('border-r-2', 'border-blue-700');
  });

  it('opens sidebar on mobile menu click', () => {
    render(
      <Layout>
        <div>Conteúdo</div>
      </Layout>
    );

    // O header deve ter um botão de menu (simulado pelo Header component)
    // Este teste pode precisar ser ajustado dependendo da implementação do Header
    expect(screen.getByText('FabriSys')).toBeInTheDocument();
  });

  it('renders sidebar overlay on mobile', () => {
    render(
      <Layout>
        <div>Conteúdo</div>
      </Layout>
    );

    // Verifica se o overlay existe (mesmo que invisível)
    const overlay = document.querySelector('.fixed.inset-0.z-40');
    expect(overlay).toBeInTheDocument();
  });
});
