/**
 * Tests del catalogStore (Zustand).
 * Usa .getState() / .setState() en vez del hook para operar fuera de React.
 */

import type { VitrinaOut, CatalogService } from '../../src/api/catalog';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetVitrina = jest.fn<Promise<VitrinaOut>, []>();
const mockActivateVitrina = jest.fn<
  Promise<{ vitrina_active: boolean; slug: string | null; vitrina_url: string | null }>,
  [boolean]
>();
const mockDeleteService = jest.fn<Promise<void>, [string]>();

jest.mock('../../src/api/catalog', () => ({
  getVitrina: (...args: any[]) => mockGetVitrina(...args),
  activateVitrina: (...args: any[]) => mockActivateVitrina(...args),
  deleteService: (...args: any[]) => mockDeleteService(...args),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'http://localhost:8000' } } },
}));
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<CatalogService> = {}): CatalogService {
  return {
    id: 'svc-001',
    merchant_id: 'merch-001',
    name: 'Corte de cabello',
    description: null,
    price: '25.00',
    image_url: null,
    payment_link_token: 'tok-abc',
    position: 0,
    active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeVitrina(overrides: Partial<VitrinaOut> = {}): VitrinaOut {
  return {
    slug: null,
    bio: null,
    profile_image_url: null,
    vitrina_active: false,
    vitrina_url: null,
    services: [],
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

import { useCatalogStore } from '../../src/store/catalogStore';

beforeEach(() => {
  // Resetear al estado inicial antes de cada test
  useCatalogStore.setState({ vitrina: null, loading: false });
  mockGetVitrina.mockReset();
  mockActivateVitrina.mockReset();
  mockDeleteService.mockReset();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

// C1: estado inicial
test('C1: initial state is vitrina=null, loading=false', () => {
  const { vitrina, loading } = useCatalogStore.getState();
  expect(vitrina).toBeNull();
  expect(loading).toBe(false);
});

// C2: fetchVitrina carga datos y loading queda false
test('C2: fetchVitrina sets vitrina and clears loading', async () => {
  const v = makeVitrina({ slug: 'mi-negocio', vitrina_active: true });
  mockGetVitrina.mockResolvedValueOnce(v);

  await useCatalogStore.getState().fetchVitrina();

  const { vitrina, loading } = useCatalogStore.getState();
  expect(loading).toBe(false);
  expect(vitrina?.slug).toBe('mi-negocio');
  expect(vitrina?.vitrina_active).toBe(true);
});

// C3: toggleActive actualiza vitrina_active, slug y vitrina_url
test('C3: toggleActive(true) updates vitrina_active and vitrina_url', async () => {
  // Carga vitrina base primero
  mockGetVitrina.mockResolvedValueOnce(makeVitrina());
  await useCatalogStore.getState().fetchVitrina();

  mockActivateVitrina.mockResolvedValueOnce({
    vitrina_active: true,
    slug: 'mi-negocio',
    vitrina_url: 'https://medianetpay.ec/v/mi-negocio',
  });

  await useCatalogStore.getState().toggleActive(true);

  const { vitrina } = useCatalogStore.getState();
  expect(vitrina?.vitrina_active).toBe(true);
  expect(vitrina?.slug).toBe('mi-negocio');
  expect(vitrina?.vitrina_url).toBe('https://medianetpay.ec/v/mi-negocio');
  expect(mockActivateVitrina).toHaveBeenCalledWith(true);
});

// C4: removeService elimina el servicio del array
test('C4: removeService removes the service by id', async () => {
  const svc1 = makeService({ id: 'svc-001', name: 'Corte' });
  const svc2 = makeService({ id: 'svc-002', name: 'Tinte' });
  mockGetVitrina.mockResolvedValueOnce(makeVitrina({ services: [svc1, svc2] }));
  await useCatalogStore.getState().fetchVitrina();

  mockDeleteService.mockResolvedValueOnce(undefined);
  await useCatalogStore.getState().removeService('svc-001');

  const services = useCatalogStore.getState().vitrina?.services ?? [];
  expect(services).toHaveLength(1);
  expect(services[0].id).toBe('svc-002');
  expect(mockDeleteService).toHaveBeenCalledWith('svc-001');
});

// C5: setVitrina reemplaza directamente el estado
test('C5: setVitrina replaces vitrina state directly', () => {
  const v = makeVitrina({ slug: 'directo', bio: 'Descripción directa' });
  useCatalogStore.getState().setVitrina(v);

  const { vitrina } = useCatalogStore.getState();
  expect(vitrina?.slug).toBe('directo');
  expect(vitrina?.bio).toBe('Descripción directa');
});
