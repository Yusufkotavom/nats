import { CompanySubscriptionStatus } from "@/prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type CompanyAccessState = {
  isReadOnly: boolean;
  reason:
    | "OK"
    | "NO_SUBSCRIPTION"
    | "TRIAL_ENDED"
    | "SUBSCRIPTION_ENDED"
    | "SUBSCRIPTION_INACTIVE";
  subscriptionStatus: CompanySubscriptionStatus | null;
  trialEndsAt: Date | null;
};

export async function getCompanyAccessState(companyId: string): Promise<CompanyAccessState> {
  let subscription: { status: CompanySubscriptionStatus; endDate: Date | null } | null = null;
  try {
    subscription = await prisma.companySubscription.findUnique({
      where: { companyId },
      select: {
        status: true,
        endDate: true,
      },
    });
  } catch (error) {
    console.error("getCompanyAccessState subscription lookup failed:", error);
    return {
      isReadOnly: false,
      reason: "OK",
      subscriptionStatus: null,
      trialEndsAt: null,
    };
  }

  if (!subscription) {
    return {
      isReadOnly: true,
      reason: "NO_SUBSCRIPTION",
      subscriptionStatus: null,
      trialEndsAt: null,
    };
  }

  const now = new Date();

  if (subscription.status === CompanySubscriptionStatus.TRIAL) {
    const trialEndsAt = subscription.endDate ?? null;
    if (trialEndsAt && trialEndsAt < now) {
      return {
        isReadOnly: true,
        reason: "TRIAL_ENDED",
        subscriptionStatus: subscription.status,
        trialEndsAt,
      };
    }

    return {
      isReadOnly: false,
      reason: "OK",
      subscriptionStatus: subscription.status,
      trialEndsAt,
    };
  }

  if (subscription.status === CompanySubscriptionStatus.ACTIVE) {
    if (subscription.endDate && subscription.endDate < now) {
      return {
        isReadOnly: true,
        reason: "SUBSCRIPTION_ENDED",
        subscriptionStatus: subscription.status,
        trialEndsAt: null,
      };
    }

    return {
      isReadOnly: false,
      reason: "OK",
      subscriptionStatus: subscription.status,
      trialEndsAt: null,
    };
  }

  return {
    isReadOnly: true,
    reason: "SUBSCRIPTION_INACTIVE",
    subscriptionStatus: subscription.status,
    trialEndsAt: null,
  };
}
