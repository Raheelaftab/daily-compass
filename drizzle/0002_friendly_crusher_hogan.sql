CREATE TYPE "public"."prayer_name" AS ENUM('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');--> statement-breakpoint
CREATE TYPE "public"."prayer_status" AS ENUM('pending', 'prayed', 'missed');--> statement-breakpoint
CREATE TABLE "prayer_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"prayer_date" date NOT NULL,
	"prayer" "prayer_name" NOT NULL,
	"status" "prayer_status" DEFAULT 'pending' NOT NULL,
	"first_reminded_at" timestamp with time zone,
	"last_reminded_at" timestamp with time zone,
	"last_reminder_minute_key" varchar(20),
	"snooze_until" timestamp with time zone,
	"prayed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prayer_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"city" varchar(100) DEFAULT 'Timonium' NOT NULL,
	"state" varchar(50) DEFAULT 'MD' NOT NULL,
	"country" varchar(50) DEFAULT 'US' NOT NULL,
	"latitude" varchar(20),
	"longitude" varchar(20),
	"method" integer DEFAULT 2 NOT NULL,
	"school" integer DEFAULT 1 NOT NULL,
	"snooze_option_a_minutes" integer DEFAULT 10 NOT NULL,
	"snooze_option_b_minutes" integer DEFAULT 20 NOT NULL,
	"re_remind_interval_minutes" integer DEFAULT 15 NOT NULL,
	"fajr_enabled" boolean DEFAULT true NOT NULL,
	"dhuhr_enabled" boolean DEFAULT true NOT NULL,
	"asr_enabled" boolean DEFAULT true NOT NULL,
	"maghrib_enabled" boolean DEFAULT true NOT NULL,
	"isha_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_times" (
	"id" serial PRIMARY KEY NOT NULL,
	"prayer_date" date NOT NULL,
	"fajr" varchar(5) NOT NULL,
	"dhuhr" varchar(5) NOT NULL,
	"asr" varchar(5) NOT NULL,
	"maghrib" varchar(5) NOT NULL,
	"isha" varchar(5) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prayer_times_prayer_date_unique" UNIQUE("prayer_date")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "prayer_log_date_prayer_unique" ON "prayer_log" USING btree ("prayer_date","prayer");--> statement-breakpoint
CREATE INDEX "prayer_log_date_idx" ON "prayer_log" USING btree ("prayer_date");