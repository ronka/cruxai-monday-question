"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";
import { useRef } from "react";
import { makeStore } from "@/store";
import type { AppStore } from "@/store";

export default function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore>();
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  const queryClientRef = useRef<QueryClient>();
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }

  return (
    <ReduxProvider store={storeRef.current}>
      <QueryClientProvider client={queryClientRef.current}>
        {children}
      </QueryClientProvider>
    </ReduxProvider>
  );
}

