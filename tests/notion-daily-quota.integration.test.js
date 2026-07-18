const assert = require("assert");
const path = require("path");

const root = path.join(__dirname, "..");
const serverRoot = path.join(root, "server");
require(path.join(serverRoot, "node_modules", "dotenv")).config({ path: path.join(root, ".env") });
process.env.DATABASE_URL = "postgresql://exportai:exportai_secret@localhost:5433/exportai?schema=public";
process.env.TS_NODE_PROJECT = path.join(serverRoot, "tsconfig.json");
require(path.join(serverRoot, "node_modules", "ts-node", "register", "transpile-only"));

const prisma = require(path.join(serverRoot, "src", "utils", "prisma")).default;
const { NotionQuotaService } = require(path.join(serverRoot, "src", "services", "notion-quota.service"));

async function run() {
  const user = await prisma.user.create({
    data: {
      email: `quota-test-${Date.now()}@example.invalid`,
      passwordHash: "temporary-test-only",
    },
  });

  try {
    const first = await NotionQuotaService.reserve(user.id, "request-1");
    const second = await NotionQuotaService.reserve(user.id, "request-2");
    const third = await NotionQuotaService.reserve(user.id, "request-3");
    assert.deepStrictEqual([first.remaining, second.remaining, third.remaining], [2, 1, 0]);

    await assert.rejects(
      () => NotionQuotaService.reserve(user.id, "request-4"),
      (error) => error?.statusCode === 402 && /3/.test(String(error.message))
    );

    const duplicate = await NotionQuotaService.reserve(user.id, "request-2");
    assert.strictEqual(duplicate.duplicate, true);
    assert.strictEqual(duplicate.remaining, 0);

    const release = await NotionQuotaService.release(user.id, "request-3");
    assert.strictEqual(release.released, true);
    const afterRelease = await NotionQuotaService.reserve(user.id, "request-5");
    assert.strictEqual(afterRelease.remaining, 0);

    await prisma.membership.create({
      data: { userId: user.id, planType: "LIFETIME", status: "ACTIVE" },
    });
    const member = await NotionQuotaService.reserve(user.id, "request-6");
    assert.strictEqual(member.unlimited, true);
    assert.strictEqual(member.counted, false);
  } finally {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
    await prisma.$disconnect();
  }
}

run()
  .then(() => console.log("notion daily quota integration passed"))
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect().catch(() => null);
    process.exit(1);
  });
