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

// Simple in-memory mock for localStorage to support tests and Supabase auth
if (typeof window !== 'undefined' && !window.localStorage) {
  const storageStore: Record<string, string> = {};
  const localStorageMock = {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(storageStore, key) ? storageStore[key] : null;
    },
    setItem(key: string, value: string) {
      storageStore[key] = String(value);
    },
    removeItem(key: string) {
      delete storageStore[key];
    },
    clear() {
      for (const k of Object.keys(storageStore)) delete storageStore[k];
    },
  } as Storage;

  // assign in test env
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.localStorage = localStorageMock;

  // Provide an async-compatible storage adapter that some libs (eg. @supabase/auth-js)
  // may try to use (expects getItem/setItem possibly async).
  // Expose as global `storage` to be safe.
  // global for tests
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.storage = {
    async getItem(key: string) {
      return localStorageMock.getItem(key);
    },
    async setItem(key: string, value: string) {
      return localStorageMock.setItem(key, value as string);
    },
    async removeItem(key: string) {
      return localStorageMock.removeItem(key);
    },
  };
}
