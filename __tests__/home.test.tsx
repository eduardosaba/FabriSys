/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import Home from '../app/page';

describe('Home page', () => {
  it('renders without crashing', () => {
    // app/page may export a Next component shape; cast to any for a simple smoke test
    render((<Home />) as any);
    // The default template shows a getting-started message; assert that instead of a project name.
    expect(screen.getByText(/To get started/i)).toBeInTheDocument();
  });
});
