import { expect, test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import { readFile } from "fs/promises";
import { STORAGE_STATE_PATH } from "../auth/login.helpers";

const { SUPABASE_URL, SUPABASE_KEY } = process.env;

// Konfiguracja tabel do wyczyszczenia podczas teardown
const TABLES_TO_CLEANUP = ["flashcards", "generations"] as const;
type TableName = (typeof TABLES_TO_CLEANUP)[number];

const ensureEnv = () => {
  teardown.skip(!SUPABASE_URL || !SUPABASE_KEY, "Supabase teardown requires SUPABASE_URL and SUPABASE_KEY");
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing required environment variables");
  }
};

// Helper do logowania z timestampem
const log = (message: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [teardown] ${message}`);
};

interface StorageCookie {
  name: string;
  value: string;
}

const loadAuthCookie = async (): Promise<StorageCookie> => {
  const storageJson = JSON.parse(await readFile(STORAGE_STATE_PATH, "utf8"));
  const authCookie = (storageJson.cookies ?? []).find((cookie: any) => cookie.name.includes("auth-token"));
  if (!authCookie) {
    throw new Error("Nie znaleziono cookie autoryzacyjnego w storage state");
  }
  return authCookie;
};

const extractAccessTokenFromToken = (tokenValue: string): string | null => {
  const prefix = "base64-";
  if (!tokenValue.startsWith(prefix)) return null;
  const payload = tokenValue.slice(prefix.length);
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
};

const createSupabaseWithSession = async () => {
  const authCookie = await loadAuthCookie();
  const accessToken = extractAccessTokenFromToken(authCookie.value);
  if (!accessToken) {
    throw new Error("Nie można wyciągnąć access_token z cookie Supabase");
  }

  const supabase = createClient<Database>(SUPABASE_URL as string, SUPABASE_KEY as string, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return { supabase };
};

const getUserId = async (supabase: any): Promise<string> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error(`Nie można pobrać użytkownika: ${error?.message ?? "User not found"}`);
  }
  return user.id;
};

const countUserRows = async (supabase: any, table: TableName, userId: string) => {
  const { count, error } = await supabase
    .from(table)
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Nie można policzyć wierszy w ${table}: ${error.message}`);
  }

  log(`${table} count: ${count}`);
  return count ?? 0;
};

teardown("cleanup supabase test data", async () => {
  ensureEnv();
  const { supabase } = await createSupabaseWithSession();
  const userId = await getUserId(supabase);

  for (const table of TABLES_TO_CLEANUP) {
    const beforeCount = await countUserRows(supabase, table, userId);
    log(`${table} records before delete: ${beforeCount}`);
  }

  // Równoległe usuwanie wszystkich tabel z lepszą obsługą błędów
  const deletePromises = TABLES_TO_CLEANUP.map((table) => supabase.from(table).delete().eq("user_id", userId));

  const deleteResults = await Promise.allSettled(deletePromises);

  // Sprawdź wyniki usuwania - zgłoś wszystkie błędy
  const errors: string[] = [];
  deleteResults.forEach((result, index) => {
    const table = TABLES_TO_CLEANUP[index];
    if (result.status === "rejected") {
      errors.push(`Usuwanie ${table} nie powiodło się: ${result.reason}`);
    } else {
      const value = result.value as any;
      if (value.error) {
        errors.push(`Usuwanie ${table} nie powiodło się: ${value.error.message}`);
      } else {
        log(`Deleted ${value.count ?? 0} records from ${table}`);
      }
    }
  });

  // Jeśli były błędy, zgłoś je wszystkie
  if (errors.length > 0) {
    throw new Error(`Teardown errors:\n${errors.join("\n")}`);
  }

  // Walidacja - sprawdź czy wszystkie dane zostały usunięte
  const validationErrors: string[] = [];
  for (const table of TABLES_TO_CLEANUP) {
    const afterCount = await countUserRows(supabase, table, userId);
    log(`${table} records after delete: ${afterCount}`);

    if (afterCount !== 0) {
      validationErrors.push(`${table} still has ${afterCount} records after cleanup`);
    }
  }

  // Jeśli walidacja nie przeszła, zgłoś błąd
  if (validationErrors.length > 0) {
    throw new Error(`Teardown validation failed:\n${validationErrors.join("\n")}`);
  }

  log("Teardown completed successfully - all test data cleaned up");
  expect(validationErrors.length).toBe(0);
});
