import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/errors';
import { MembershipService } from './membership.service';

const FREE_DAILY_NOTION_LIMIT = 3;
const QUOTA_TIME_ZONE = 'Asia/Shanghai';

function currentUsageDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: QUOTA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function normalizeRequestId(value: unknown): string {
  const requestId = String(value || '').trim().slice(0, 255);
  if (!requestId) throw new AppError(400, 'requestId is required.');
  return requestId;
}

async function getFreeUsage(userId: string, usageDate: Date) {
  const usage = await prisma.notionDailyUsage.findUnique({
    where: { userId_usageDate: { userId, usageDate } },
  });
  const used = Math.max(0, Number(usage?.usageCount || 0));
  return {
    limit: FREE_DAILY_NOTION_LIMIT,
    used,
    remaining: Math.max(0, FREE_DAILY_NOTION_LIMIT - used),
  };
}

export const NotionQuotaService = {
  FREE_DAILY_NOTION_LIMIT,
  QUOTA_TIME_ZONE,

  async getStatus(userId: string) {
    const membership = await MembershipService.getMembership(userId);
    if (membership.isMember) {
      return { unlimited: true, isMember: true, limit: null, used: null, remaining: null };
    }
    const usageDate = new Date(`${currentUsageDate()}T00:00:00.000Z`);
    return { unlimited: false, isMember: false, ...(await getFreeUsage(userId, usageDate)) };
  },

  async reserve(userId: string, value: unknown) {
    const requestId = normalizeRequestId(value);
    const membership = await MembershipService.getMembership(userId);
    if (membership.isMember) {
      return {
        allowed: true,
        counted: false,
        duplicate: false,
        unlimited: true,
        isMember: true,
        limit: null,
        used: null,
        remaining: null,
      };
    }

    const usageDateText = currentUsageDate();
    const usageDate = new Date(`${usageDateText}T00:00:00.000Z`);

    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.notionExportRequest.findUnique({
          where: { userId_requestId: { userId, requestId } },
        });
        if (existing) {
          const usage = await tx.notionDailyUsage.findUnique({
            where: { userId_usageDate: { userId, usageDate: existing.usageDate } },
          });
          const used = Math.max(0, Number(usage?.usageCount || 0));
          return {
            allowed: true,
            counted: true,
            duplicate: true,
            unlimited: false,
            isMember: false,
            limit: FREE_DAILY_NOTION_LIMIT,
            used,
            remaining: Math.max(0, FREE_DAILY_NOTION_LIMIT - used),
          };
        }

        const rows = await tx.$queryRaw<Array<{ usage_count: number }>>(Prisma.sql`
          INSERT INTO "notion_daily_usage" (
            "id", "user_id", "usage_date", "usage_count", "created_at", "updated_at"
          ) VALUES (
            gen_random_uuid(), ${userId}::uuid, ${usageDateText}::date, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT ("user_id", "usage_date") DO UPDATE
          SET "usage_count" = "notion_daily_usage"."usage_count" + 1,
              "updated_at" = CURRENT_TIMESTAMP
          WHERE "notion_daily_usage"."usage_count" < ${FREE_DAILY_NOTION_LIMIT}
          RETURNING "usage_count"
        `);

        if (!rows.length) {
          throw new AppError(402, `今日免费发送到 Notion 的 3 次额度已用完，请升级会员后继续。`);
        }

        await tx.notionExportRequest.create({
          data: { userId, requestId, usageDate },
        });

        const used = Number(rows[0].usage_count);
        return {
          allowed: true,
          counted: true,
          duplicate: false,
          unlimited: false,
          isMember: false,
          limit: FREE_DAILY_NOTION_LIMIT,
          used,
          remaining: Math.max(0, FREE_DAILY_NOTION_LIMIT - used),
        };
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const existing = await prisma.notionExportRequest.findUnique({
          where: { userId_requestId: { userId, requestId } },
        });
        if (existing) {
          const usage = await getFreeUsage(userId, existing.usageDate);
          return {
            allowed: true,
            counted: true,
            duplicate: true,
            unlimited: false,
            isMember: false,
            ...usage,
          };
        }
      }
      throw error;
    }
  },

  async release(userId: string, value: unknown) {
    const requestId = normalizeRequestId(value);
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.notionExportRequest.findUnique({
        where: { userId_requestId: { userId, requestId } },
      });
      if (!reservation) return { released: false };

      await tx.notionExportRequest.delete({
        where: { userId_requestId: { userId, requestId } },
      });
      await tx.$executeRaw(Prisma.sql`
        UPDATE "notion_daily_usage"
        SET "usage_count" = GREATEST("usage_count" - 1, 0),
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "user_id" = ${userId}::uuid
          AND "usage_date" = ${reservation.usageDate}::date
      `);
      return { released: true };
    });
  },
};
