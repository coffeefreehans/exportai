const assert = require("assert");
const path = require("path");

process.env.TS_NODE_PROJECT = path.join(__dirname, "..", "server", "tsconfig.json");
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters";
process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "test";
process.env.STRIPE_PRICE_MONTHLY = "test";
process.env.STRIPE_PRICE_YEARLY = "test";
process.env.STRIPE_PRICE_LIFETIME = "test";
require("../server/node_modules/ts-node/register/transpile-only");

async function run() {
  const { verifyGoogleAccessToken } = require("../server/src/services/google-auth.service");
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(String(url));
    return {
      ok: true,
      json: async () => ({
        aud: "exportai-google-client-id",
        sub: "google-user-123",
        email: "google-user@example.com",
        email_verified: "true"
      })
    };
  };

  const identity = await verifyGoogleAccessToken(
    "google-access-token",
    "exportai-google-client-id",
    fetchImpl
  );

  assert.deepStrictEqual(identity, {
    subject: "google-user-123",
    email: "google-user@example.com"
  });
  assert.strictEqual(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /^https:\/\/oauth2\.googleapis\.com\/tokeninfo\?/);
  assert.strictEqual(new URL(requestedUrls[0]).searchParams.get("access_token"), "google-access-token");
}

run()
  .then(() => console.log("server Google token verification passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
