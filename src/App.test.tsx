import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App';
import { AuthenticatedUserProvider } from './contexts/AuthenticatedUserContext';

describe('App', () => {
  it('renders the ElderHive placeholder heading at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthenticatedUserProvider>
          <App />
        </AuthenticatedUserProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'ElderHive' })).toBeInTheDocument();
  });

  it('renders the role-picker Login page at /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthenticatedUserProvider>
          <App />
        </AuthenticatedUserProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Choose your login' })).toBeInTheDocument();
  });

  it.each([
    ['/login/elder', 'Elder Login'],
    ['/login/caretaker', 'Caretaker Login'],
    ['/login/family', 'Family Login'],
    ['/login/super-admin', 'Super Admin Access'],
    ['/admin/login', 'Administrator Access'],
  ])('renders the right role-specific login page at %s', (path, expectedHeading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthenticatedUserProvider>
          <App />
        </AuthenticatedUserProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: expectedHeading })).toBeInTheDocument();
  });
});
