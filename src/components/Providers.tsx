"use client";

import { AuthProvider } from "@/lib/auth/AuthProvider";
import { GateProvider } from "./Gate";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GateProvider>{children}</GateProvider>
    </AuthProvider>
  );
}
