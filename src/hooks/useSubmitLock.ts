import { useCallback, useRef, useState } from "react";

/** Impede envio duplo (duplo clique) com trava síncrona via ref + estado para desabilitar o botão. */
export function useSubmitLock() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockedRef = useRef(false);

  const withLock = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockedRef.current) return undefined;
    lockedRef.current = true;
    setIsSubmitting(true);
    try {
      return await fn();
    } finally {
      lockedRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, withLock };
}
