/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import Home from '../app/page';
import { AuthProvider } from '../lib/auth';

describe('Home page', () => {
  it('renders without crashing', () => {
    // app/page may export a Next component shape; cast to any for a simple smoke test
    render(
      <AuthProvider>
        <Home />
      </AuthProvider>
    );
    // The default template shows a getting-started message; assert that instead of a project name.
    expect(screen.getByAltText(/Logo FabriSys/i)).toBeInTheDocument();
  });
});
