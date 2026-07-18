const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "server", "prisma", "schema.prisma"), "utf8");
const migration = fs.readFileSync(path.join(root, "server", "prisma", "migrations", "20260718070000_notion_daily_quota", "migration.sql"), "utf8");
const quotaService = fs.readFileSync(path.join(root, "server", "src", "services", "notion-quota.service.ts"), "utf8");
const notionRoute = fs.readFileSync(path.join(root, "server", "src", "routes", "notion.ts"), "utf8");
const background = fs.readFileSync(path.join(root, "src", "background", "background.js"), "utf8");

assert(schema.includes("model NotionDailyUsage") && schema.includes("model NotionExportRequest"), "Notion quota usage must persist in the database.");
assert(migration.includes('CHECK ("usage_count" >= 0 AND "usage_count" <= 3)'), "Database must enforce the free daily maximum of three.");
assert(quotaService.includes("FREE_DAILY_NOTION_LIMIT = 3"), "Free accounts must receive exactly three Notion sends per day.");
assert(quotaService.includes("MembershipService.getMembership(userId)"), "Active members must bypass the free quota.");
assert(quotaService.includes("ON CONFLICT") && quotaService.includes('"usage_count" < ${FREE_DAILY_NOTION_LIMIT}'), "Quota reservation must increment atomically and stop at three.");
assert(quotaService.includes("NotionExportRequest") || quotaService.includes("notionExportRequest"), "Quota reservation must be idempotent by request ID.");
assert(notionRoute.includes("/quota/reserve") && notionRoute.includes("/quota/release"), "Authenticated Notion quota endpoints must exist.");
assert(background.includes('/api/notion/quota/reserve'), "The extension must reserve quota before creating a Notion page.");
assert(background.indexOf('/api/notion/quota/reserve') < background.indexOf('notionRequest("/pages"'), "Quota must be reserved before the Notion write.");
assert(background.includes('/api/notion/quota/release'), "Failed Notion writes must restore the reserved free quota.");

console.log("notion daily quota regression passed");
