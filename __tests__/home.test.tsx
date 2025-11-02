/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home page', () => {
  it('renders without crashing', () => {
    // app/page may export a Next component shape; cast to any for a simple smoke test
    render((<Home />) as any);
    expect(screen.getByText(/FabriSys/i)).toBeInTheDocument();
  });
});
