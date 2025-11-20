import { render, screen } from './test-utils';
import Header from '../components/Header';

describe('Header', () => {
  it('renders site title', () => {
    render(<Header />);
    expect(screen.getByText(/Confectio/i)).toBeInTheDocument();
  });
});
