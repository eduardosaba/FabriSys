// Mock do hook useRouter do Next.js para ambiente de teste (Vitest)
import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
  usePathname: () => '/',
}));
import '@testing-library/jest-dom';

// Mock para window.matchMedia no ambiente de testes
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
