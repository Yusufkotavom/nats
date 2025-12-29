"use client";

import { createContext, useContext } from "react";

type SessionData = {
  role: string;
  permissions: string[];
  companyProfile: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    taxId: string | null;
    currency: string;
    locale: string;
    timezone: string;
  } | null;
} | null;

const SessionContext = createContext<SessionData>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: SessionData;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export function useCompanyProfile() {
  const session = useContext(SessionContext);
  return session?.companyProfile;
}
