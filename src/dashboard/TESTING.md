# Simmer Web Frontend Testing Guide

This document provides instructions for testing the React frontend of the Simmer application.

## Test Setup

The frontend uses Vitest with React Testing Library for component testing:

- **Vitest**: Fast test runner compatible with Vite
- **React Testing Library**: DOM-focused testing utilities
- **@testing-library/jest-dom**: Custom matchers for DOM assertions

## Running Tests

To run all tests:

```bash
npm test
```

To run a specific test file:

```bash
npm test -- path/to/test.tsx
```

To run tests in watch mode:

```bash
npm test -- --watch
```

## Test Structure

Tests should be organized alongside the components they test:

```
src/
  components/
    ComponentName/
      __tests__/
        ComponentName.test.tsx
```

## Test Organization

Structure your tests using `describe` and `it` blocks:

```javascript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test rendering
  });
  
  it('should handle user interactions', () => {
    // Test interactions
  });
});
```

## Mocking Dependencies

### Router

Mock React Router with:

```javascript
import { BrowserRouter } from 'react-router-dom';

// In the test
render(
  <BrowserRouter>
    <YourComponent />
  </BrowserRouter>
);

// To mock useLocation or other router hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/mocked-path' })
  };
});
```

### Context Providers

Mock context providers with specific test values:

```javascript
vi.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn()
  }),
}));
```

### API Calls

Mock API calls using Jest/Vitest mocks:

```javascript
vi.mock('@services/api', () => ({
  getRecipes: vi.fn().mockResolvedValue([
    { id: 1, title: 'Test Recipe' }
  ])
}));
```

## Best Practices

1. Test behavior, not implementation:
   - Focus on what the user sees and can interact with
   - Avoid testing component internals

2. Use user-centric queries:
   - `getByRole`, `getByText`, `getByLabelText` are preferred over `getByTestId`

3. Test real interactions:
   - Use `fireEvent` or `userEvent` to simulate clicks, typing, etc.

4. Isolate tests:
   - Each test should be independent
   - Clean up mocks with `beforeEach()` and `vi.clearAllMocks()`

## Example Component Test

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Button from '../Button';

describe('Button Component', () => {
  it('renders with the correct text', () => {
    render(<Button label="Click me" />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button label="Click me" onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
``` 