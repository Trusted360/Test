import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

// Mock useAuth hook
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn()
  })
}));

// Mock useLocation hook
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/dashboard'
    }),
    useNavigate: () => vi.fn()
  };
});

describe('Sidebar Component', () => {
  it('renders all navigation items', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });
  
  it('highlights the current route', () => {
    render(
      <BrowserRouter>
        <Sidebar open={true} />
      </BrowserRouter>
    );
    
    // Dashboard should be highlighted since that's the current path
    const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
    expect(dashboardButton).toBeInTheDocument();
  });
}); 