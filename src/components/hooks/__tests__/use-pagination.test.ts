import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "../use-pagination";

describe("usePagination", () => {
  const mockItems = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  beforeEach(() => {
    // Reset state between tests
  });

  describe("initialization", () => {
    it("should initialize with page 1 by default", () => {
      const { result } = renderHook(() => usePagination(mockItems));

      expect(result.current.state.page).toBe(1);
      expect(result.current.state.perPage).toBe(30);
      expect(result.current.state.total).toBe(100);
    });

    it("should initialize with custom perPage", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      expect(result.current.state.perPage).toBe(10);
      expect(result.current.totalPages).toBe(10);
    });
  });

  describe("pagination state", () => {
    it("should calculate totalPages correctly", () => {
      const { result } = renderHook(() => usePagination(mockItems, 30));

      expect(result.current.totalPages).toBe(4); // 100 items / 30 per page = 4 pages
    });

    it("should return correct currentPageItems", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      expect(result.current.currentPageItems).toHaveLength(10);
      expect(result.current.currentPageItems[0].id).toBe(1);
      expect(result.current.currentPageItems[9].id).toBe(10);
    });

    it("should slice items correctly for page 2", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.currentPageItems).toHaveLength(10);
      expect(result.current.currentPageItems[0].id).toBe(11);
      expect(result.current.currentPageItems[9].id).toBe(20);
    });
  });

  describe("navigation", () => {
    it("should go to specific page", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.state.page).toBe(3);
      expect(result.current.currentPageItems[0].id).toBe(21);
    });

    it("should not go below page 1", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.goToPage(0);
      });

      expect(result.current.state.page).toBe(1);
    });

    it("should not go above totalPages", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.goToPage(20); // More than totalPages (10)
      });

      expect(result.current.state.page).toBe(10); // Should clamp to max page
    });

    it("should go to next page", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.state.page).toBe(2);
    });

    it("should not go beyond last page with nextPage", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.goToPage(10);
      });

      expect(result.current.state.page).toBe(10);

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.state.page).toBe(10); // Should stay on last page
    });

    it("should go to previous page", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.state.page).toBe(3);

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.state.page).toBe(2);
    });

    it("should not go below page 1 with prevPage", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.state.page).toBe(1);
    });
  });

  describe("reset", () => {
    it("should reset to page 1", () => {
      const { result } = renderHook(() => usePagination(mockItems, 10));

      act(() => {
        result.current.goToPage(5);
        result.current.reset();
      });

      expect(result.current.state.page).toBe(1);
      expect(result.current.currentPageItems[0].id).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty array", () => {
      const { result } = renderHook(() => usePagination([], 10));

      expect(result.current.state.total).toBe(0);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.currentPageItems).toHaveLength(0);
    });

    it("should handle perPage greater than items length", () => {
      const smallArray = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
      const { result } = renderHook(() => usePagination(smallArray, 10));

      expect(result.current.totalPages).toBe(1);
      expect(result.current.currentPageItems).toHaveLength(5);
    });

    it("should handle single page", () => {
      const smallArray = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
      const { result } = renderHook(() => usePagination(smallArray, 10));

      expect(result.current.totalPages).toBe(1);
      act(() => {
        result.current.nextPage();
      });
      expect(result.current.state.page).toBe(1); // Should stay on page 1
    });

    it("should update when items change", () => {
      const { result, rerender } = renderHook(({ items }) => usePagination(items, 10), {
        initialProps: { items: mockItems.slice(0, 50) },
      });

      expect(result.current.state.total).toBe(50);
      expect(result.current.totalPages).toBe(5);

      rerender({ items: mockItems.slice(0, 20) });

      expect(result.current.state.total).toBe(20);
      expect(result.current.totalPages).toBe(2);
    });
  });
});
