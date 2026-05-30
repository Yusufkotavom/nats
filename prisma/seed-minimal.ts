import { hash } from "bcryptjs";
import { prisma } from "./seed/utils";

function addOneMonth(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), 0, 0, 0),
  );
}

async function main() {
  console.log("🚀 Start minimal seed (super admin + 1 company user)...");

  const passwordPlain = "password123";
  const passwordHash = await hash(passwordPlain, 10);

  const superAdminRole = await prisma.role.upsert({
    where: { name: "superadmin" },
    update: { isActive: true, permissions: ["*"] },
    create: {
      name: "superadmin",
      description: "Platform super administrator",
      isActive: true,
      permissions: ["*"],
    },
  });

  const companyAdminRole = await prisma.role.upsert({
    where: { name: "company_admin" },
    update: { isActive: true, permissions: ["*"] },
    create: {
      name: "company_admin",
      description: "Tenant company administrator",
      isActive: true,
      permissions: ["*"],
    },
  });

  const company = await prisma.company.upsert({
    where: { code: "starter-company" },
    update: { name: "Starter Company", status: "ACTIVE" },
    create: {
      code: "starter-company",
      name: "Starter Company",
      status: "ACTIVE",
    },
  });

  await prisma.companyProfile.upsert({
    where: { companyId: company.id },
    update: {
      name: "Starter Company",
      currency: "IDR",
      currencySymbol: "Rp",
      locale: "id-ID",
      timezone: "Asia/Jakarta",
      dateFormat: "dd/MM/yyyy",
      enableDepartmentDimension: false,
      enableProjectDimension: false,
      posEnableRestaurantFeatures: false,
    },
    create: {
      companyId: company.id,
      name: "Starter Company",
      currency: "IDR",
      currencySymbol: "Rp",
      locale: "id-ID",
      timezone: "Asia/Jakarta",
      dateFormat: "dd/MM/yyyy",
      enableDepartmentDimension: false,
      enableProjectDimension: false,
      posEnableRestaurantFeatures: false,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: "platform@example.com" },
    update: { name: "Platform Super Admin", password: passwordHash, roleId: superAdminRole.id },
    create: {
      email: "platform@example.com",
      name: "Platform Super Admin",
      password: passwordHash,
      roleId: superAdminRole.id,
    },
  });

  const companyAdmin = await prisma.user.upsert({
    where: { email: "admin@starter.local" },
    update: { name: "Starter Company Admin", password: passwordHash, roleId: companyAdminRole.id },
    create: {
      email: "admin@starter.local",
      name: "Starter Company Admin",
      password: passwordHash,
      roleId: companyAdminRole.id,
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: companyAdmin.id,
      },
    },
    update: { isDefault: true },
    create: {
      companyId: company.id,
      userId: companyAdmin.id,
      isDefault: true,
    },
  });

  await prisma.companyMembership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: superAdmin.id,
      },
    },
    update: { isDefault: false },
    create: {
      companyId: company.id,
      userId: superAdmin.id,
      isDefault: false,
    },
  });

  const now = new Date();
  const trialEndsAt = addOneMonth(now);

  await prisma.companySubscription.upsert({
    where: { companyId: company.id },
    update: {
      status: "TRIAL",
      startDate: now,
      endDate: trialEndsAt,
      nextBillingDate: trialEndsAt,
      autoRenew: false,
    },
    create: {
      companyId: company.id,
      status: "TRIAL",
      startDate: now,
      endDate: trialEndsAt,
      nextBillingDate: trialEndsAt,
      autoRenew: false,
    },
  });

  console.log("✅ Minimal seed done");
  console.log("Superadmin:", "platform@example.com", "/", passwordPlain);
  console.log("Company admin:", "admin@starter.local", "/", passwordPlain);
}

main()
  .catch((e) => {
    console.error("❌ Minimal seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
