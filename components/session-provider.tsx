"use client";

import { createContext, useContext } from "react";
import { Role } from "@/prisma/generated/prisma/enums";

type SessionData = {
  userId: string;
  role: Role;
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
