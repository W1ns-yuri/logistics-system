CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_name" text NOT NULL,
	"user_email" text NOT NULL,
	"text" text NOT NULL,
	"page" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "promo_until" date;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "signup" jsonb;--> statement-breakpoint
-- Старым записям дата создания неизвестна: оставляем пусто, чтобы они не съели месячный лимит Basic
ALTER TABLE "records" ADD COLUMN "created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "records" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_created_idx" ON "feedback" USING btree ("created_at");