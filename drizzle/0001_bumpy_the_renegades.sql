CREATE TABLE "telegram_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" varchar(50),
	"morning_digest" boolean DEFAULT true NOT NULL,
	"evening_nudge" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timers" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"area_id" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"note" varchar(300)
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_parent_id" integer;--> statement-breakpoint
ALTER TABLE "timers" ADD CONSTRAINT "timers_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timers" ADD CONSTRAINT "timers_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_recurrence_parent_idx" ON "tasks" USING btree ("recurrence_parent_id");