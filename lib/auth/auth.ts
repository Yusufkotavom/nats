import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secretKey = process.env.SESSION_SECRET || "default-secret-key-change-me";
const key = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  roleId: string;
  role: string; // Storing role name
  permissions: string[];
  expiresAt: Date;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function createSession(
  userId: string,
  role: { id: string; name: string; permissions: string[] }
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({
    userId,
    roleId: role.id,
    role: role.name,
    permissions: role.permissions,
    expiresAt,
  });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  const payload = await decrypt(session);

  if (!session || !payload) {
    return null;
  }

  return {
    isAuth: true,
    userId: payload.userId,
    roleId: payload.roleId,
    role: payload.role,
    permissions: payload.permissions,
  };
}

export async function verifySession() {
  const session = await getSession();

  if (!session) {
    redirect("/auth");
  }

  return session;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
