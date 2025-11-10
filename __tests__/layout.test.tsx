import { render, screen } from '@testing-library/react';
import Layout from '../components/Layout';
import { ThemeProvider } from '../lib/theme';

describe('Layout', () => {
  it('renders children and header', () => {
    render(
      <ThemeProvider>
        <Layout>
          <div>Conteúdo</div>
        </Layout>
      </ThemeProvider>
    );
    expect(screen.getByText(/Conteúdo/i)).toBeInTheDocument();
    expect(screen.getByText(/FabriSys/i)).toBeInTheDocument();
  });
});
