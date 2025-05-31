import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Header from '../Header';
import '@testing-library/jest-dom'; // Fix for toBeInTheDocument

// Mock the useAuth hook with different user states
const mockUseAuth = vi.fn();
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to logged out
    mockUseAuth.mockReturnValue({
      user: null,
      logout: vi.fn(),
    });
  });

  it('renders the logo', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Trusted360')).toBeInTheDocument();
  });

  it('shows login and register buttons when user is not authenticated', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('calls the onMenuToggle function when menu button is clicked', () => {
    const onMenuToggle = vi.fn();
    
    render(
      <BrowserRouter>
        <Header onMenuToggle={onMenuToggle} />
      </BrowserRouter>
    );
    
    fireEvent.click(screen.getByLabelText('open drawer'));
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('shows user account icon when user is authenticated', () => {
    // Mock authenticated user
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@example.com' },
      logout: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Register')).not.toBeInTheDocument();
    expect(screen.getByLabelText('account of current user')).toBeInTheDocument();
  });

  it('shows profile and logout options when user menu is clicked', async () => {
    const mockLogout = vi.fn();
    
    // Mock authenticated user
    mockUseAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@example.com' },
      logout: mockLogout,
    });

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    
    // Click the user menu
    fireEvent.click(screen.getByLabelText('account of current user'));
    
    // Check that the menu options are displayed
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    
    // Click logout
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
}); 