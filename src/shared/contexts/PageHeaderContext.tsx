'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface PageHeaderAction {
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export interface PageHeaderConfig {
  title: string;
  description?: string;
  icon?: string;
  actions?: PageHeaderAction[];
  /** Arbitrary rich widget rendered in the right slot (filters, date pickers, etc.) */
  content?: ReactNode;
}

// Split read/write contexts to avoid re-render loops when pages push fresh
// closures on every render — only the Header subscribes to the read side.
const PageHeaderReadContext = createContext<PageHeaderConfig | null>(null);
const PageHeaderWriteContext = createContext<(config: PageHeaderConfig | null) => void>(() => {});

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [pageHeader, setPageHeader] = useState<PageHeaderConfig | null>(null);
  return (
    <PageHeaderWriteContext.Provider value={setPageHeader}>
      <PageHeaderReadContext.Provider value={pageHeader}>
        {children}
      </PageHeaderReadContext.Provider>
    </PageHeaderWriteContext.Provider>
  );
}

/** Used by the Header to read the current page's header config. */
export function usePageHeaderValue() {
  return useContext(PageHeaderReadContext);
}

/**
 * Pages call this to inject their title / icon / actions / content into the
 * app shell header. Re-pushes on every render so actions always close over
 * current state. Clears automatically on unmount.
 */
export function usePageHeader(config: PageHeaderConfig | null) {
  const setPageHeader = useContext(PageHeaderWriteContext);

  // Re-push every render so closures stay fresh.
  useEffect(() => {
    setPageHeader(config);
  });

  // Clear on unmount only.
  useEffect(() => {
    return () => setPageHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
