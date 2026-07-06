"use server";

import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { selectAdForUser } from "@/lib/ads";

export async function getAdForPlacementAction(placement: string, businessType?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, ad: null };

  try {
    const ad = await selectAdForUser(session.user.id, placement, businessType);
    return { success: true, ad };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function trackAdImpressionAction(campaignId: string) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  try {
    await db.adImpression.create({
      data: {
        campaignId,
        userId,
      },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function trackAdClickAction(campaignId: string) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id || null;

  try {
    await db.adClick.create({
      data: {
        campaignId,
        userId,
      },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
