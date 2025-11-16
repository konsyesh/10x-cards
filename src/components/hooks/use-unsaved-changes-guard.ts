import { useEffect, useState } from "react";

interface UseUnsavedChangesGuardOptions {
  enabled?: boolean;
  onWarning?: () => void;
}

/**
 * Hook do śledzenia niezapisanych zmian i ostrzegania przy opuszczaniu strony
 */
export const useUnsavedChangesGuard = (hasChanges: boolean, options: UseUnsavedChangesGuardOptions = {}) => {
  const { enabled = true, onWarning } = options;
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !hasChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, hasChanges]);

  const confirmSave = () => {
    setShowModal(false);
    onWarning?.();
  };

  const confirmDiscard = () => {
    setShowModal(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const confirmCancel = () => {
    setShowModal(false);
    setPendingNavigation(null);
  };

  return {
    showModal,
    setShowModal,
    confirmSave,
    confirmDiscard,
    confirmCancel,
  };
};
