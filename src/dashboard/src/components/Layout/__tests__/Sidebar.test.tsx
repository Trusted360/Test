import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from '../Sidebar';

// Mock useLocation hook
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/dashboard'
    })
  };
});

// Mock useMediaQuery hook
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => false, // Desktop view
  };
});

describe('Sidebar Component', () => {
  it('renders all navigation items', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    
    // Use getAllByText to handle multiple elements with the same text
    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Recipes')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Meal Plans')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Shopping Lists')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Cooking Assistant')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Profile')[0]).toBeInTheDocument();
  });
  
  it('highlights the current route', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    
    // Use attribute selectors to find the Dashboard link directly
    const dashboardItem = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardItem).toHaveClass('Mui-selected');
    
    // Other items should not be selected
    const recipesItem = screen.getByRole('link', { name: /recipes/i });
    expect(recipesItem).not.toHaveClass('Mui-selected');
  });
}); 