import { render, screen } from '@testing-library/react';
import Header from '../components/Header';

describe('Header', () => {
  it('renders site title', () => {
    render(<Header />);
    expect(screen.getByText(/FabriSys/i)).toBeInTheDocument();
  });
});
