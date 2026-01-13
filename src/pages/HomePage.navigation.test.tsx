import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('HomePage Navigation Tests', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('navigates to /signup when "Start Invoicing for Free" button is clicked', { timeout: 10000 }, async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    const signupButton = screen.getByRole('button', { name: /start invoicing for free/i });
    await user.click(signupButton);

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates to /login when "Login here" link is clicked', { timeout: 10000 }, async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    const loginLink = screen.getByRole('link', { name: /login here/i });
    await user.click(loginLink);

    // Link component uses declarative navigation, so we check the href
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('navigates to /signup when "Create My First Invoice Now" button is clicked', { timeout: 10000 }, async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    const ctaButton = screen.getByRole('button', { name: /create my first invoice now/i });
    await user.click(ctaButton);

    expect(mockNavigate).toHaveBeenCalledWith('/signup');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('has all navigation elements present', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    // Check all navigation elements exist
    expect(screen.getByRole('button', { name: /start invoicing for free/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login here/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create my first invoice now/i })).toBeInTheDocument();
  });
});
