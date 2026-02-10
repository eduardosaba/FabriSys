import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock envs used by the route module
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

// We'll mock @supabase/supabase-js before importing the route
const mockInsertResponses: Array<any> = [];

vi.mock('@supabase/supabase-js', async () => {
  return {
    createClient: () => {
      return {
        from: (table: string) => ({
          insert: (rows: any[]) => ({
            select: async () => {
              const resp = mockInsertResponses.shift();
              if (!resp) return { data: null, error: { message: 'no mock response' } };
              return resp;
            },
          }),
          update: (payload: any) => ({
            eq: async (col: string, val: any) => ({ data: null, error: null }),
          }),
        }),
        auth: {},
      };
    },
  };
});

describe('POST /api/fichas-tecnicas/create (server)', () => {
  beforeEach(() => {
    mockInsertResponses.length = 0;
  });

  it('returns 201 when insert succeeds on first attempt', async () => {
    // prepare mock success
    mockInsertResponses.push({ data: [{ id: 'row-1' }], error: null });

    const { POST } = await import('../../app/api/fichas-tecnicas/create/route');

    const body = {
      produto_final_id: 'prod-1',
      insumos: [{ insumoId: 'ins-1', quantidade: 1, unidadeMedida: 'kg', perdaPadrao: 0 }],
      nome: 'FT Test',
      preco_venda: 10,
      rendimento: 1,
      slug_base: 'ft-prod-1',
    };

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data).toBeDefined();
  });

  it('retries on duplicate error and succeeds', async () => {
    // first response: duplicate error, second: success
    mockInsertResponses.push({ data: null, error: { message: 'duplicate key', code: '23505' } });
    mockInsertResponses.push({ data: [{ id: 'row-2' }], error: null });

    const { POST } = await import('../../app/api/fichas-tecnicas/create/route');

    const body = {
      produto_final_id: 'prod-2',
      insumos: [{ insumoId: 'ins-2', quantidade: 2, unidadeMedida: 'kg', perdaPadrao: 0 }],
      nome: 'FT Test 2',
      preco_venda: 20,
      rendimento: 2,
      slug_base: 'ft-prod-2',
    };

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data).toBeDefined();
  });

  it('returns 500 if all attempts fail with non-duplicate error', async () => {
    // simulate unexpected error
    mockInsertResponses.push({ data: null, error: { message: 'some server error', code: '500' } });

    const { POST } = await import('../../app/api/fichas-tecnicas/create/route');

    const body = {
      produto_final_id: 'prod-3',
      insumos: [{ insumoId: 'ins-3', quantidade: 3, unidadeMedida: 'kg', perdaPadrao: 0 }],
      nome: 'FT Test 3',
      preco_venda: 30,
      rendimento: 3,
      slug_base: 'ft-prod-3',
    };

    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBeDefined();
  });
});
