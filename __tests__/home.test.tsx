/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from './test-utils';
import Home from '../app/page';

describe('Home page', () => {
  it('renders without crashing', () => {
    // app/page may export a Next component shape; cast to any for a simple smoke test
    render(<Home />);
    // The default template shows a getting-started message; assert that instead of a project name.
    expect(screen.getByAltText(/Logo Confectio/i)).toBeInTheDocument();
  });
});
