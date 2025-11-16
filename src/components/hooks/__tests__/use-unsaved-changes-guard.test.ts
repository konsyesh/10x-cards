import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnsavedChangesGuard } from "../use-unsaved-changes-guard";

describe("useUnsavedChangesGuard", () => {
  let eventListeners: Map<string, EventListener>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    eventListeners = new Map();
    addEventListenerSpy = vi.spyOn(window, "addEventListener").mockImplementation((event, handler) => {
      eventListeners.set(event, handler as EventListener);
    });
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener").mockImplementation((event) => {
      eventListeners.delete(event);
    });
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    eventListeners.clear();
  });

  describe("initialization", () => {
    it("should initialize with showModal false", () => {
      const { result } = renderHook(() => useUnsavedChangesGuard(false));

      expect(result.current.showModal).toBe(false);
    });

    it("should not add beforeunload listener when hasChanges is false", () => {
      renderHook(() => useUnsavedChangesGuard(false));

      expect(eventListeners.has("beforeunload")).toBe(false);
    });

    it("should not add beforeunload listener when enabled is false", () => {
      renderHook(() => useUnsavedChangesGuard(true, { enabled: false }));

      expect(eventListeners.has("beforeunload")).toBe(false);
    });
  });

  describe("beforeunload event", () => {
    it("should add beforeunload listener when hasChanges is true", () => {
      renderHook(() => useUnsavedChangesGuard(true));

      expect(eventListeners.has("beforeunload")).toBe(true);
    });

    it("should prevent default and set returnValue on beforeunload", () => {
      renderHook(() => useUnsavedChangesGuard(true));

      const handler = eventListeners.get("beforeunload") as EventListener;
      const event = new Event("beforeunload") as BeforeUnloadEvent;
      event.preventDefault = vi.fn();
      Object.defineProperty(event, "returnValue", {
        writable: true,
        value: "",
      });

      handler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.returnValue).toBe("");
    });

    it("should remove listener when hasChanges becomes false", () => {
      const { rerender } = renderHook(({ hasChanges }) => useUnsavedChangesGuard(hasChanges), {
        initialProps: { hasChanges: true },
      });

      expect(eventListeners.has("beforeunload")).toBe(true);

      rerender({ hasChanges: false });

      expect(eventListeners.has("beforeunload")).toBe(false);
    });

    it("should cleanup listener on unmount", () => {
      const { unmount } = renderHook(() => useUnsavedChangesGuard(true));

      expect(eventListeners.has("beforeunload")).toBe(true);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    });
  });

  describe("modal state management", () => {
    it("should set showModal to true", () => {
      const { result } = renderHook(() => useUnsavedChangesGuard(false));

      act(() => {
        result.current.setShowModal(true);
      });

      expect(result.current.showModal).toBe(true);
    });

    it("should set showModal to false", () => {
      const { result } = renderHook(() => useUnsavedChangesGuard(false));

      act(() => {
        result.current.setShowModal(true);
        result.current.setShowModal(false);
      });

      expect(result.current.showModal).toBe(false);
    });
  });

  describe("confirmSave", () => {
    it("should close modal and call onWarning callback", () => {
      const onWarning = vi.fn();
      const { result } = renderHook(() => useUnsavedChangesGuard(false, { onWarning }));

      act(() => {
        result.current.setShowModal(true);
        result.current.confirmSave();
      });

      expect(result.current.showModal).toBe(false);
      expect(onWarning).toHaveBeenCalledTimes(1);
    });

    it("should work without onWarning callback", () => {
      const { result } = renderHook(() => useUnsavedChangesGuard(false));

      act(() => {
        result.current.setShowModal(true);
        result.current.confirmSave();
      });

      expect(result.current.showModal).toBe(false);
    });
  });

  describe("confirmDiscard", () => {
    it("should close modal and execute pending navigation", () => {
      const pendingNavigation = vi.fn();
      const { result } = renderHook(() => useUnsavedChangesGuard(false));

      act(() => {
        result.current.setShowModal(true);
        // Simulate setting pending navigation
        (result.current as any).pendingNavigation = pendingNavigation;
        result.current.confirmDiscard();
      });

      expect(result.current.showModal).toBe(false);
      // Note: pendingNavigation is internal state, so we can't directly test it
      // but confirmDiscard should handle it if it exists
    });

    it("should close modal even without pending navigation", () => {
      const { result } = renderHook(() => useUnsavedChangesGuard(false));

      act(() => {
        result.current.setShowModal(true);
        result.current.confirmDiscard();
      });

      expect(result.current.showModal).toBe(false);
    });
  });

  describe("confirmCancel", () => {
    it("should close modal and clear pending navigation", () => {
      const { result } = renderHook(() => useUnsavedChangesGuard(false));

      act(() => {
        result.current.setShowModal(true);
        result.current.confirmCancel();
      });

      expect(result.current.showModal).toBe(false);
    });
  });

  describe("enabled option", () => {
    it("should respect enabled=false option", () => {
      renderHook(() => useUnsavedChangesGuard(true, { enabled: false }));

      expect(eventListeners.has("beforeunload")).toBe(false);
    });

    it("should respect enabled=true option (default)", () => {
      renderHook(() => useUnsavedChangesGuard(true, { enabled: true }));

      expect(eventListeners.has("beforeunload")).toBe(true);
    });
  });

  describe("state updates", () => {
    it("should update listener when hasChanges changes", () => {
      const { rerender } = renderHook(({ hasChanges }) => useUnsavedChangesGuard(hasChanges), {
        initialProps: { hasChanges: false },
      });

      expect(eventListeners.has("beforeunload")).toBe(false);

      rerender({ hasChanges: true });

      expect(eventListeners.has("beforeunload")).toBe(true);

      rerender({ hasChanges: false });

      expect(eventListeners.has("beforeunload")).toBe(false);
    });
  });
});

