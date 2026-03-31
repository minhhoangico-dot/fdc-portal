-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "wcr_report_snapshots" (
    "id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "week_end" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "week_number" INTEGER NOT NULL,
    "report_data" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wcr_report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcr_infectious_codes" (
    "id" TEXT NOT NULL,
    "icd_code" TEXT NOT NULL,
    "icd_pattern" TEXT NOT NULL,
    "disease_name_vi" TEXT NOT NULL,
    "disease_name_en" TEXT,
    "disease_group" TEXT NOT NULL,
    "color_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wcr_infectious_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcr_service_mappings" (
    "id" TEXT NOT NULL,
    "category_key" TEXT NOT NULL,
    "category_name_vi" TEXT NOT NULL,
    "display_group" TEXT NOT NULL,
    "match_type" TEXT NOT NULL,
    "match_value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "wcr_service_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcr_age_groups" (
    "id" TEXT NOT NULL,
    "group_key" TEXT NOT NULL,
    "group_name_vi" TEXT NOT NULL,
    "min_age" INTEGER NOT NULL,
    "max_age" INTEGER NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "wcr_age_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wcr_report_logs" (
    "id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "details" JSONB,
    "error_message" TEXT,

    CONSTRAINT "wcr_report_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wcr_report_snapshots_year_week_number_key" ON "wcr_report_snapshots"("year", "week_number");

-- CreateIndex
CREATE UNIQUE INDEX "wcr_service_mappings_category_key_key" ON "wcr_service_mappings"("category_key");

-- CreateIndex
CREATE UNIQUE INDEX "wcr_age_groups_group_key_key" ON "wcr_age_groups"("group_key");

