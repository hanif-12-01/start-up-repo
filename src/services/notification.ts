import 'server-only';

import { cache } from 'react';
import { db } from '@/lib/db';

export const NotificationType = {
  INPUT_MISSING: 'INPUT_MISSING',
  USAGE_SPIKE: 'USAGE_SPIKE',
  BILL_PREDICTION_UP: 'BILL_PREDICTION_UP',
  RECOMMENDATION_READY: 'RECOMMENDATION_READY',
  REPORT_READY: 'REPORT_READY',
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

export async function createNotificationIfMissing(input: {
  userId: string;
  businessId?: string | null;
  title: string;
  message: string;
  type: NotificationTypeValue;
}) {
  const existing = await db.notification.findFirst({
    where: {
      userId: input.userId,
      businessId: input.businessId ?? null,
      type: input.type,
      title: input.title,
      isRead: false,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return db.notification.create({
    data: {
      userId: input.userId,
      businessId: input.businessId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
    },
    select: { id: true },
  });
}

export const getNotificationsForUser = cache(async (userId: string, businessId?: string | null) => {
  return db.notification.findMany({
    where: {
      userId,
      OR: [{ businessId: businessId ?? null }, { businessId: null }],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      businessId: true,
      title: true,
      message: true,
      type: true,
      isRead: true,
      createdAt: true,
    },
  });
});

export const getUnreadNotificationCount = cache(async (userId: string, businessId?: string | null) => {
  return db.notification.count({
    where: {
      userId,
      isRead: false,
      OR: [{ businessId: businessId ?? null }, { businessId: null }],
    },
  });
});

export async function markNotificationRead(userId: string, notificationId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string, businessId?: string | null) {
  return db.notification.updateMany({
    where: {
      userId,
      isRead: false,
      OR: [{ businessId: businessId ?? null }, { businessId: null }],
    },
    data: { isRead: true },
  });
}
