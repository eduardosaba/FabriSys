import { render, screen } from '@testing-library/react';
import Layout from '../components/Layout';

describe('Layout', () => {
  it('renders children and header', () => {
    render(
      <Layout>
        <div>Conteúdo</div>
      </Layout>
    );
    expect(screen.getByText(/Conteúdo/i)).toBeInTheDocument();
    expect(screen.getByText(/FabriSys/i)).toBeInTheDocument();
  });
});
