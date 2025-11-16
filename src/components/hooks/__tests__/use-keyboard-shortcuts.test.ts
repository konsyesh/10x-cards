import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";

describe("useKeyboardShortcuts", () => {
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
    it("should add keydown event listener when enabled", () => {
      const handlers = {
        onAccept: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    });

    it("should not add listener when disabled", () => {
      const handlers = {
        onAccept: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, false));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it("should cleanup listener on unmount", () => {
      const handlers = {
        onAccept: vi.fn(),
      };

      const { unmount } = renderHook(() => useKeyboardShortcuts(handlers, true));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    });
  });

  describe("keyboard shortcuts", () => {
    it("should trigger onAccept when 'A' key is pressed", () => {
      const handlers = {
        onAccept: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(handlers.onAccept).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it("should trigger onEdit when 'E' key is pressed", () => {
      const handlers = {
        onEdit: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "e", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(handlers.onEdit).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it("should trigger onReject when 'R' key is pressed", () => {
      const handlers = {
        onReject: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "r", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(handlers.onReject).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it("should trigger onSave when 'S' key is pressed", () => {
      const handlers = {
        onSave: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "s", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(handlers.onSave).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it("should trigger onPrevCard when ArrowLeft is pressed", () => {
      const handlers = {
        onPrevCard: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(handlers.onPrevCard).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it("should trigger onNextCard when ArrowRight is pressed", () => {
      const handlers = {
        onNextCard: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(handlers.onNextCard).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it("should trigger onPrevPage when PageUp is pressed", () => {
      const handlers = {
        onPrevPage: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "PageUp", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(handlers.onPrevPage).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });

    it("should trigger onNextPage when PageDown is pressed", () => {
      const handlers = {
        onNextPage: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "PageDown", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      handler(event);

      expect(handlers.onNextPage).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("ignoring form elements", () => {
    it("should ignore shortcuts when focus is on INPUT", () => {
      const handlers = {
        onAccept: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const input = document.createElement("input");
      const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      Object.defineProperty(event, "target", { value: input });

      handler(event);

      expect(handlers.onAccept).not.toHaveBeenCalled();
    });

    it("should ignore shortcuts when focus is on TEXTAREA", () => {
      const handlers = {
        onAccept: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const textarea = document.createElement("textarea");
      const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      Object.defineProperty(event, "target", { value: textarea });

      handler(event);

      expect(handlers.onAccept).not.toHaveBeenCalled();
    });

    it("should work when focus is on other elements", () => {
      const handlers = {
        onAccept: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const div = document.createElement("div");
      const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      Object.defineProperty(event, "target", { value: div });

      handler(event);

      expect(handlers.onAccept).toHaveBeenCalledTimes(1);
    });
  });

  describe("optional handlers", () => {
    it("should not throw when handler is undefined", () => {
      const handlers = {};

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });

      expect(() => handler(event)).not.toThrow();
    });

    it("should work with partial handlers", () => {
      const handlers = {
        onAccept: vi.fn(),
        // onEdit, onReject, etc. are undefined
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });

      handler(event);

      expect(handlers.onAccept).toHaveBeenCalledTimes(1);
    });
  });

  describe("case insensitivity", () => {
    it("should work with uppercase keys", () => {
      const handlers = {
        onAccept: vi.fn(),
      };

      renderHook(() => useKeyboardShortcuts(handlers, true));

      const handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "A", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });

      handler(event);

      expect(handlers.onAccept).toHaveBeenCalledTimes(1);
    });
  });

  describe("handler updates", () => {
    it("should update handlers when they change", () => {
      const handlers1 = { onAccept: vi.fn() };
      const handlers2 = { onAccept: vi.fn() };

      const { rerender } = renderHook(({ handlers }) => useKeyboardShortcuts(handlers, true), {
        initialProps: { handlers: handlers1 },
      });

      // Get handler after first render
      let handler = eventListeners.get("keydown") as EventListener;
      const event = new KeyboardEvent("keydown", { key: "a", bubbles: true });
      Object.defineProperty(event, "target", { value: document.body });

      handler(event);
      expect(handlers1.onAccept).toHaveBeenCalledTimes(1);

      rerender({ handlers: handlers2 });

      // Get updated handler after rerender
      handler = eventListeners.get("keydown") as EventListener;
      handler(event);
      expect(handlers2.onAccept).toHaveBeenCalledTimes(1);
    });
  });
});
