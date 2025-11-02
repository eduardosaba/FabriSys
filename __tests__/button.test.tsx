import { render, screen } from '@testing-library/react';
import Button from '../components/Button';

describe('Button component', () => {
  it('renders label text', () => {
    render(<Button label="Clique" />);
    expect(screen.getByText(/Clique/i)).toBeInTheDocument();
  });
});
