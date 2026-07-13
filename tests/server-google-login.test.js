const assert = require("assert");
const path = require("path");

process.env.TS_NODE_PROJECT = path.join(__dirname, "..", "server", "tsconfig.json");
process.env.DATABASE_URL = "postgresql://exportai:exportai_secret@localhost:5433/exportai?schema=public";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "test";
process.env.STRIPE_PRICE_MONTHLY = "test";
process.env.STRIPE_PRICE_YEARLY = "test";
process.env.STRIPE_PRICE_LIFETIME = "test";
require("../server/node_modules/ts-node/register/transpile-only");

async function run() {
  const authService = require("../server/src/services/auth.service");
  const prisma = require("../server/src/utils/prisma").default;
  const email = `google-login-${Date.now()}@example.com`;
  try {
    const result = await authService.loginWithGoogle(
      "google-access-token",
      "exportai-google-client-id",
      async () => ({ subject: "google-user-123", email })
    );

    assert.strictEqual(result.user.email, email);
    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(user, "Google login must create the ExportAI user when it is the first login.");
    assert.ok(user.passwordHash, "Google users must still satisfy the existing database schema.");
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}

run()
  .then(() => console.log("server Google login passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
