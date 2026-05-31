DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanType') THEN
    CREATE TYPE "PlanType" AS ENUM ('MONTHLY', 'YEARLY', 'LIFETIME');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipStatus') THEN
    CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "memberships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "plan_type" "PlanType" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "stripe_customer_id" VARCHAR(255),
  "stripe_subscription_id" VARCHAR(255),
  "stripe_payment_intent_id" VARCHAR(255),
  "expires_at" TIMESTAMP,
  "cancelled_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "memberships_user_id_key" ON "memberships"("user_id");
CREATE INDEX IF NOT EXISTS "memberships_stripe_customer_id_idx" ON "memberships"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "memberships_stripe_subscription_id_idx" ON "memberships"("stripe_subscription_id");
