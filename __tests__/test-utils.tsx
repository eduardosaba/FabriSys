import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../lib/theme';
import { AuthProvider } from '../lib/auth';

// Wrapper que inclui todos os providers necessários para os testes
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
};

// Função customizada de render que inclui todos os providers
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-exporta tudo do testing-library
export * from '@testing-library/react';

// Override da função render
export { customRender as render };
