import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AuthenticatedUserProvider } from './contexts/AuthenticatedUserContext';
import { request } from './services';
import { UserTypeEnum } from './utils/enums';

vi.mock('./services', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services')>();
  return { ...actual, request: vi.fn() };
});

const mockedRequest = vi.mocked(request);

function seedCachedUser(primaryRole: (typeof UserTypeEnum)[keyof typeof UserTypeEnum]) {
  localStorage.setItem(
    'elderhive_user',
    JSON.stringify({ id: 1, email: `${primaryRole.toLowerCase()}@example.com`, userType: primaryRole, primaryRole, roles: [primaryRole] })
  );
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedRequest.mockReset();
  });

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
    ['/register', 'Create your account'],
    ['/forgot-password', 'Forgot your password?'],
    ['/reset-password', 'Reset your password'],
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

  describe('authenticated route shells', () => {
    it.each([
      ['/elder/dashboard', 'Elder Dashboard'],
      ['/caretaker/dashboard', 'Caretaker Dashboard'],
      ['/family/dashboard', 'Family Dashboard'],
    ])('a logged-in matching-role user lands on %s with its placeholder dashboard', async (path, expectedHeading) => {
      const role = path.includes('elder') ? UserTypeEnum.ELDER : path.includes('caretaker') ? UserTypeEnum.CARETAKER : UserTypeEnum.FAMILY_MEMBER;
      seedCachedUser(role);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return []; // near-empty sidebar for non-admin roles
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={[path]}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: expectedHeading })).toBeInTheDocument();
      expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    });

    it('an ADMIN lands on the shared admin shell showing "Admin" as the roleLabel', async () => {
      seedCachedUser(UserTypeEnum.ADMIN);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') {
          return [{ id: 1, navGroup: null, navIndex: 0, name: 'Manage Users', path: '/admin/users', icon: 'users', requiredPermission: null, superAdminOnly: false, status: 'ACTIVE' }];
        }
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Manage Users' })).toBeInTheDocument();
    });

    it('a SUPER_ADMIN lands on the same admin shell but with "Super Admin" as the roleLabel', async () => {
      seedCachedUser(UserTypeEnum.SUPER_ADMIN);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: 'Super Admin Dashboard' })).toBeInTheDocument();
    });

    it('redirects an unauthenticated visitor hitting a protected shell to /login', async () => {
      render(
        <MemoryRouter initialEntries={['/elder/dashboard']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: 'Choose your login' })).toBeInTheDocument();
    });

    it('redirects a logged-in ELDER trying to reach the admin shell back to their own dashboard', async () => {
      seedCachedUser(UserTypeEnum.ELDER);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: 'Elder Dashboard' })).toBeInTheDocument();
    });

    it('a SUPER_ADMIN can reach /admin/platform-settings', async () => {
      seedCachedUser(UserTypeEnum.SUPER_ADMIN);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        if (method === 'GET' && url === '/meta-configs') return [];
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/platform-settings']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: 'Platform Settings' })).toBeInTheDocument();
    });

    it('an ADMIN hitting /admin/platform-settings is redirected back to the admin dashboard', async () => {
      seedCachedUser(UserTypeEnum.ADMIN);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/platform-settings']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Platform Settings' })).not.toBeInTheDocument();
    });

    it('a SUPER_ADMIN can reach /admin/color-themes and sees Add Theme', async () => {
      seedCachedUser(UserTypeEnum.SUPER_ADMIN);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        if (method === 'GET' && url === '/api/v1/color-themes') {
          return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 9, first: true, last: true, numberOfElements: 0, empty: true };
        }
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/color-themes']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Color Themes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add Theme' })).toBeInTheDocument();
    });

    it('a curated ADMIN can reach /admin/color-themes but never sees Add Theme', async () => {
      seedCachedUser(UserTypeEnum.ADMIN);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        if (method === 'GET' && url === '/api/v1/color-themes') {
          return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 9, first: true, last: true, numberOfElements: 0, empty: true };
        }
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/color-themes']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Color Themes')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add Theme' })).not.toBeInTheDocument();
    });

    it('an ADMIN hitting /admin/color-themes/new directly is redirected back to the listing', async () => {
      seedCachedUser(UserTypeEnum.ADMIN);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        if (method === 'GET' && url === '/api/v1/color-themes') {
          return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 9, first: true, last: true, numberOfElements: 0, empty: true };
        }
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/color-themes/new']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Color Themes')).toBeInTheDocument();
      expect(screen.queryByText('Create Color Theme')).not.toBeInTheDocument();
    });

    it('a SUPER_ADMIN can reach /admin/color-themes/new', async () => {
      seedCachedUser(UserTypeEnum.SUPER_ADMIN);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={['/admin/color-themes/new']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Create Color Theme')).toBeInTheDocument();
    });

    it.each([
      ['/admin/account-settings', UserTypeEnum.SUPER_ADMIN],
      ['/caretaker/account-settings', UserTypeEnum.CARETAKER],
      ['/elder/account-settings', UserTypeEnum.ELDER],
      ['/family/account-settings', UserTypeEnum.FAMILY_MEMBER],
    ])('every role (here: %s) can reach its own account-settings "pick your theme" entry point', async (path, role) => {
      seedCachedUser(role);
      mockedRequest.mockImplementation(async (method: string, url: string) => {
        if (method === 'POST' && url === '/auth/refresh') return undefined;
        if (method === 'GET' && url === '/nav-links/me') return [];
        if (method === 'GET' && url === '/api/v1/color-themes') {
          return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 9, first: true, last: true, numberOfElements: 0, empty: true };
        }
        throw new Error(`Unexpected request: ${method} ${url}`);
      });

      render(
        <MemoryRouter initialEntries={[path]}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(await screen.findByText('Account Settings')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Add Theme' })).not.toBeInTheDocument();
    });

    it('still resolves /admin/login to the Administrator Access page, not the admin shell (route-ranking check)', () => {
      render(
        <MemoryRouter initialEntries={['/admin/login']}>
          <AuthenticatedUserProvider>
            <App />
          </AuthenticatedUserProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Administrator Access' })).toBeInTheDocument();
    });
  });
});
