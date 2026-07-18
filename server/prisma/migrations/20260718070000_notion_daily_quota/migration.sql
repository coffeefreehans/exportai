CREATE TABLE IF NOT EXISTS "notion_daily_usage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "usage_date" DATE NOT NULL,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notion_daily_usage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notion_daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notion_daily_usage_count_check" CHECK ("usage_count" >= 0 AND "usage_count" <= 3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "notion_daily_usage_user_id_usage_date_key"
  ON "notion_daily_usage"("user_id", "usage_date");

CREATE TABLE IF NOT EXISTS "notion_export_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "request_id" VARCHAR(255) NOT NULL,
  "usage_date" DATE NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notion_export_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notion_export_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "notion_export_requests_user_id_request_id_key"
  ON "notion_export_requests"("user_id", "request_id");

CREATE INDEX IF NOT EXISTS "notion_export_requests_user_id_usage_date_idx"
  ON "notion_export_requests"("user_id", "usage_date");
