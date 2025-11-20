// Mock do hook useRouter do Next.js para ambiente de teste (Vitest)
import { vi } from 'vitest';
import React from 'react';

// Mock do hook useAuth - deve ser definido antes dos outros imports
vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { id: 'test-profile', role: 'admin', name: 'Test User' },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

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
