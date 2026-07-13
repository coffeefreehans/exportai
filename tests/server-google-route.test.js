const assert = require("assert");
const path = require("path");
const { spawn } = require("child_process");

async function run() {
  const projectRoot = path.join(__dirname, "..");
  const port = 4099;
  const child = spawn(
    process.execPath,
    ["-r", path.join(projectRoot, "server", "node_modules", "ts-node", "register", "transpile-only"), path.join(projectRoot, "server", "src", "index.ts")],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        TS_NODE_PROJECT: path.join(projectRoot, "server", "tsconfig.json"),
        PORT: String(port),
        DATABASE_URL: "postgresql://exportai:exportai_secret@localhost:5433/exportai?schema=public",
        JWT_SECRET: "test-secret-that-is-at-least-32-characters",
        STRIPE_SECRET_KEY: "test",
        STRIPE_WEBHOOK_SECRET: "test",
        STRIPE_PRICE_MONTHLY: "test",
        STRIPE_PRICE_YEARLY: "test",
        STRIPE_PRICE_LIFETIME: "test",
        GOOGLE_CLIENT_ID: "exportai-google-client-id"
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  try {
    const deadline = Date.now() + 10000;
    let ready = false;
    while (!ready && Date.now() < deadline) {
      try {
        const response = await fetch(`http://localhost:${port}/api/health`);
        ready = response.ok;
      } catch (_) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.strictEqual(ready, true, `Test server did not start. ${output}`);

    const response = await fetch(`http://localhost:${port}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const body = await response.json();
    assert.strictEqual(response.status, 400, "The Google login endpoint must validate its access token payload.");
    assert.match(String(body.message), /accessToken/i);
  } finally {
    child.kill();
  }
}

run()
  .then(() => console.log("server Google route passed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
