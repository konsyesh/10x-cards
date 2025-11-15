import { vi } from "vitest";
import type { SupabaseClient, Session, User } from "@supabase/supabase-js";

/**
 * Supabase Mock Factory Pattern
 * Provides type-safe, reusable Supabase client mocks for testing
 */

// ============================================================================
// User & Auth Mocks
// ============================================================================

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: "test-user-id",
  aud: "authenticated",
  role: "authenticated",
  email: "test@example.com",
  email_confirmed_at: new Date().toISOString(),
  phone: "",
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockSession = (overrides?: Partial<Session>): Session => ({
  provider_token: "test-provider-token",
  provider_refresh_token: null,
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: "bearer",
  user: createMockUser(),
  ...overrides,
});

// ============================================================================
// Database Query Builder Mocks
// ============================================================================

export interface MockQueryBuilder {
  select: vi.Mock;
  insert: vi.Mock;
  update: vi.Mock;
  delete: vi.Mock;
  eq: vi.Mock;
  single: vi.Mock;
  range: vi.Mock;
  in: vi.Mock;
}

/**
 * Creates a mock query builder that supports chaining like Supabase
 * Example: from("table").insert(data).select() returns Promise<{data, error}>
 */
export const createMockQueryBuilder = (): any => {
  const builder: any = {};

  // select() can be called standalone or after insert/update
  builder.select = vi.fn().mockResolvedValue({ data: [], error: null });

  // insert() returns a builder with select() method
  builder.insert = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));

  // update() returns a builder with eq() and other methods
  builder.update = vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));

  builder.delete = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  builder.range = vi.fn().mockReturnValue(builder);
  builder.in = vi.fn().mockResolvedValue({ data: [], error: null });

  return builder;
};

// ============================================================================
// Supabase Client Mock Factory
// ============================================================================

/**
 * Create a fully mocked Supabase client for testing
 *
 * Example:
 * ```typescript
 * const { supabase, from } = createMockSupabaseClient();
 * // Default: returns empty query builder
 * from.mockReturnValue(createMockQueryBuilder());
 *
 * // Or customize for specific table:
 * from.mockImplementation((table) => {
 *   if (table === "flashcards") {
 *     const builder = createMockQueryBuilder();
 *     builder.insert.mockImplementation(() => ({
 *       select: vi.fn().mockResolvedValue({ data: [...], error: null }),
 *     }));
 *     return builder;
 *   }
 *   return createMockQueryBuilder();
 * });
 * ```
 */
export const createMockSupabaseClient = (): {
  supabase: SupabaseClient;
  from: vi.Mock;
  auth: { getUser: vi.Mock; getSession: vi.Mock };
  rpc: vi.Mock;
} => {
  const fromMock = vi.fn().mockReturnValue(createMockQueryBuilder());
  const rpcMock = vi.fn();
  const authGetUserMock = vi.fn();
  const authGetSessionMock = vi.fn();

  const supabase: any = {
    from: fromMock,
    rpc: rpcMock,
    auth: {
      getUser: authGetUserMock,
      getSession: authGetSessionMock,
      onAuthStateChange: vi.fn().mockReturnValue(() => {}),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
    },
  };

  return {
    supabase,
    from: fromMock,
    auth: {
      getUser: authGetUserMock,
      getSession: authGetSessionMock,
    },
    rpc: rpcMock,
  };
};

// ============================================================================
// Common Database Response Mocks
// ============================================================================

export const createMockDatabaseResponse = <T>(data: T, overrides?: { error?: string }) => ({
  data,
  error: overrides?.error ? { message: overrides.error } : null,
  status: overrides?.error ? 400 : 200,
  statusText: overrides?.error ? "Bad Request" : "OK",
});

export const createMockFlashcard = (overrides?: Partial<any>) => ({
  id: "fc-" + Math.random().toString(36).substring(7),
  collection_id: "col-test",
  front: "Question?",
  back: "Answer",
  source: "manual" as const,
  generation_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockGeneration = (overrides?: Partial<any>) => ({
  id: "gen-" + Math.random().toString(36).substring(7),
  user_id: "test-user-id",
  source_text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  source_text_hash: "hash-abc123",
  source_text_length: 50,
  model: "gpt-4o-mini",
  flashcards_count: 5,
  status: "completed" as const,
  result: [
    { front: "Q1?", back: "A1" },
    { front: "Q2?", back: "A2" },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockCollection = (overrides?: Partial<any>) => ({
  id: "col-" + Math.random().toString(36).substring(7),
  user_id: "test-user-id",
  name: "Test Collection",
  description: "A test collection",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// Helper: Chain Query Builder Responses
// ============================================================================

/**
 * Helper to easily mock chained Supabase queries
 *
 * Example:
 * ```typescript
 * const { from } = createMockSupabaseClient();
 * mockSupabaseQuery(from, 'flashcards')
 *   .select()
 *   .data([{ id: '1', front: 'Q?', back: 'A' }]);
 * ```
 */
export const mockSupabaseQuery = (fromMock: vi.Mock, tableName: string) => {
  const builder = createMockQueryBuilder();

  fromMock.mockReturnValue(builder);

  return {
    select: (data?: any[]) => {
      builder.select.mockReturnValue({
        ...builder,
        data: data || [],
        error: null,
      });
      return this;
    },
    insert: (data?: any) => {
      builder.insert.mockReturnValue({
        ...builder,
        data: data || {},
        error: null,
      });
      return this;
    },
    update: (data?: any) => {
      builder.update.mockReturnValue({
        ...builder,
        data: data || {},
        error: null,
      });
      return this;
    },
  };
};
