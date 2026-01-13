import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
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

describe('HomePage Navigation Property Tests', () => {
  afterEach(() => {
    cleanup();
    mockNavigate.mockClear();
  });

  // Feature: homepage-integration, Property 3: Navigation Button Functionality
  // Validates: Requirements 5.1, 5.2, 5.3
  it('Property 3: navigation routes are consistent across multiple renders', { timeout: 30000 }, () => {
    // This property tests that the navigation configuration remains consistent
    // across multiple component instances
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), () => {
        cleanup();
        mockNavigate.mockClear();
        
        render(
          <BrowserRouter>
            <HomePage />
          </BrowserRouter>
        );

        // Verify navigation elements exist with correct configuration
        const heroSignupButton = screen.getByRole('button', { name: /start invoicing for free/i });
        const loginLink = screen.getByRole('link', { name: /login here/i });
        const ctaSignupButton = screen.getByRole('button', { name: /create my first invoice now/i });

        // All elements should be present
        expect(heroSignupButton).toBeInTheDocument();
        expect(loginLink).toBeInTheDocument();
        expect(ctaSignupButton).toBeInTheDocument();

        // Login link should always point to /login
        expect(loginLink).toHaveAttribute('href', '/login');

        cleanup();
        
        return true;
      }),
      { numRuns: 20 } // Reduced to 20 for performance
    );
  });

  // Property: Button click handlers are properly configured
  it('Property: all signup buttons trigger navigation to /signup', { timeout: 30000 }, async () => {
    // Test a sample of button clicks to verify navigation is configured correctly
    const numTests = 5; // Reduced to 5 for performance
    
    for (let i = 0; i < numTests; i++) {
      cleanup();
      mockNavigate.mockClear();
      
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      const user = userEvent.setup();

      // Test hero signup button
      const heroSignupButton = screen.getByRole('button', { name: /start invoicing for free/i });
      await user.click(heroSignupButton);
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
      
      cleanup();
      mockNavigate.mockClear();
      
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      );

      // Test CTA signup button
      const ctaSignupButton = screen.getByRole('button', { name: /create my first invoice now/i });
      await user.click(ctaSignupButton);
      expect(mockNavigate).toHaveBeenCalledWith('/signup');
      
      cleanup();
    }
  });
});
