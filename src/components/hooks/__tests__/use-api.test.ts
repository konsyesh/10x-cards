import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApi } from "../use-api";
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";

describe("useApi", () => {
  it("should return fetchJson and ApiError", () => {
    const { result } = renderHook(() => useApi());

    expect(result.current.fetchJson).toBe(fetchJson);
    expect(result.current.ApiError).toBe(ApiError);
  });

  it("should return consistent references", () => {
    const { result, rerender } = renderHook(() => useApi());

    const firstFetchJson = result.current.fetchJson;
    const firstApiError = result.current.ApiError;

    rerender();

    expect(result.current.fetchJson).toBe(firstFetchJson);
    expect(result.current.ApiError).toBe(firstApiError);
  });
});

