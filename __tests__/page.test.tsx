import { render, screen, fireEvent, waitFor } from './test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Home from '../app/page';

// Mock do Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock do Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: any) => <img src={src} alt={alt} className={className} />,
}));

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SplashScreen', () => {
    it('should render splash screen initially', () => {
      render(<Home />);

      expect(screen.getByText(/Carregando/)).toBeInTheDocument();
      expect(screen.getByAltText('Logo Confectio')).toBeInTheDocument();
    });

    it('should transition to login form after splash', async () => {
      render(<Home />);

      // Verifica se o splash aparece inicialmente
      expect(screen.getByText(/Carregando/)).toBeInTheDocument();

      // Espera o splash terminar e o OnboardingLogin aparecer
      await waitFor(
        () => {
          expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verifica se mudou para o form de login
      expect(screen.getByText('O segredo da gestão gourmet.')).toBeInTheDocument();
    });
  });

  describe('OnboardingLogin', () => {
    it('should render login form when user is not authenticated', async () => {
      render(<Home />);

      // Espera splash terminar
      await waitFor(
        () => {
          expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByText('O segredo da gestão gourmet.')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/seu@email.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    });

    it('should toggle password visibility', async () => {
      render(<Home />);

      // Espera splash terminar
      await waitFor(
        () => {
          expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const passwordInput = screen.getByPlaceholderText(/••••••••/i);
      const toggleButton = screen.getByRole('button', { name: 'Mostrar senha' });

      // Inicialmente senha deve estar oculta
      expect(passwordInput).toHaveAttribute('type', 'password');

      fireEvent.click(toggleButton);

      // Após clique, senha deve estar visível
      expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });
});
