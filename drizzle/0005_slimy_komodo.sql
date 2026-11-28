UPDATE "prayer_settings" SET "latitude" = '39.437' WHERE "latitude" IS NULL OR trim("latitude") = '';--> statement-breakpoint
UPDATE "prayer_settings" SET "longitude" = '-76.62' WHERE "longitude" IS NULL OR trim("longitude") = '';--> statement-breakpoint
ALTER TABLE "prayer_settings" ALTER COLUMN "latitude" SET DEFAULT '39.437';--> statement-breakpoint
ALTER TABLE "prayer_settings" ALTER COLUMN "latitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prayer_settings" ALTER COLUMN "longitude" SET DEFAULT '-76.62';--> statement-breakpoint
ALTER TABLE "prayer_settings" ALTER COLUMN "longitude" SET NOT NULL;
