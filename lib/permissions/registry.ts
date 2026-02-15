import type { PermissionType } from "./utils";
import { getPermissionRegistry } from "@/modules/plugins";

export const register: PermissionType[] = getPermissionRegistry();
