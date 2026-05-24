import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  userId: string;
  userName: string;
  roleId: string;
  role: string;
  permissions: string[];
  activeCompanyId: string | null;
  isPlatformSuperAdmin: boolean;
  impersonatedCompanyId: string | null;
  expiresAt: Date;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("FATAL: SESSION_SECRET environment variable is not set!");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
