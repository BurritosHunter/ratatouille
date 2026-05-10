"use client";

import { useCallback, useState } from "react";

export function useDisclosure(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((previous) => !previous);
  }, []);

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setIsOpen(nextOpen);
  }, []);

  return { isOpen, open, close, toggle, onOpenChange };
}
