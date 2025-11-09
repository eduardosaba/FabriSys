import { render, screen } from '@testing-library/react';
import Header from '../components/Header';
import { ThemeProvider } from '../lib/theme';

describe('Header', () => {
  it('renders site title', () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>
    );
    expect(screen.getByText(/Sistema Lari/i)).toBeInTheDocument();
  });
});
