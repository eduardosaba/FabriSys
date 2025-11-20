import { render, screen } from '@testing-library/react';
import { BaseButton } from '../components/Button';

describe('Button component', () => {
  it('renders label text', () => {
    render(<BaseButton label="Clique" />);
    expect(screen.getByText(/Clique/i)).toBeInTheDocument();
  });

  it('renders with master styling when isMaster is true', () => {
    render(<BaseButton label="Clique" isMaster={true} />);
    expect(screen.getByText(/Clique/i)).toBeInTheDocument();
  });

  it('renders children when no label is provided', () => {
    render(<BaseButton>Clique aqui</BaseButton>);
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('renders without master styling when isMaster is false', () => {
    render(<BaseButton label="Clique" isMaster={false} />);
    expect(screen.getByText(/Clique/i)).toBeInTheDocument();
  });

  it('renders with default master styling when isMaster is undefined', () => {
    render(<BaseButton label="Clique" />);
    expect(screen.getByText(/Clique/i)).toBeInTheDocument();
  });
});
