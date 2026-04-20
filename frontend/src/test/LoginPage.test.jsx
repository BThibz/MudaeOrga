import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';

describe('LoginPage', () => {
  it('renders login button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Connexion avec Discord/i)).toBeInTheDocument();
  });

  it('renders app title', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByText('MudaeOrga')).toBeInTheDocument();
  });

  it('login link points to /auth/discord', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /Connexion avec Discord/i });
    expect(link.getAttribute('href')).toContain('/auth/discord');
  });
});
