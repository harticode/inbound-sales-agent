DO $$ BEGIN
 CREATE TYPE "public"."call_outcome" AS ENUM('booked', 'declined', 'no_loads', 'carrier_not_eligible', 'negotiation_failed', 'transferred', 'callback_requested', 'dropped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sentiment" AS ENUM('positive', 'neutral', 'negative', 'frustrated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."call_event_type" AS ENUM('call_started', 'carrier_verify', 'load_search', 'negotiate', 'call_logged');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loads" (
	"id" serial PRIMARY KEY NOT NULL,
	"load_id" varchar(50) NOT NULL,
	"origin" varchar(200) NOT NULL,
	"destination" varchar(200) NOT NULL,
	"pickup_datetime" timestamp with time zone NOT NULL,
	"delivery_datetime" timestamp with time zone NOT NULL,
	"equipment_type" varchar(50) NOT NULL,
	"loadboard_rate" real NOT NULL,
	"notes" text DEFAULT '',
	"weight" real,
	"commodity_type" varchar(100) DEFAULT '',
	"num_of_pieces" integer,
	"miles" real,
	"dimensions" varchar(100) DEFAULT '',
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loads_load_id_unique" UNIQUE("load_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"mc_number" varchar(20) NOT NULL,
	"legal_name" varchar(200) DEFAULT '',
	"dba_name" varchar(200) DEFAULT '',
	"dot_number" varchar(20) DEFAULT '',
	"entity_type" varchar(50) DEFAULT '',
	"operating_status" varchar(50) DEFAULT '',
	"allowed_to_operate" varchar(10) DEFAULT '',
	"phone" varchar(20) DEFAULT '',
	"total_drivers" integer,
	"total_power_units" integer,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carriers_mc_number_unique" UNIQUE("mc_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" varchar(100) NOT NULL,
	"carrier_id" integer,
	"load_id" integer,
	"carrier_mc_number" varchar(20) DEFAULT '',
	"carrier_name" varchar(200) DEFAULT '',
	"caller_name" varchar(200) DEFAULT '',
	"origin_requested" varchar(200) DEFAULT '',
	"destination_requested" varchar(200) DEFAULT '',
	"equipment_requested" varchar(50) DEFAULT '',
	"loadboard_rate" real,
	"initial_offer" real,
	"final_agreed_rate" real,
	"counter_offers" jsonb DEFAULT '[]'::jsonb,
	"negotiation_rounds" integer DEFAULT 0 NOT NULL,
	"outcome" "call_outcome" DEFAULT 'dropped' NOT NULL,
	"sentiment" "sentiment" DEFAULT 'neutral' NOT NULL,
	"call_duration_seconds" integer,
	"notes" text DEFAULT '',
	"extracted_data" jsonb DEFAULT '{}'::jsonb,
	"transcript_summary" text DEFAULT '',
	"started_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calls_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "call_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"call_id" varchar(100) NOT NULL,
	"event_type" "call_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calls" ADD CONSTRAINT "calls_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calls" ADD CONSTRAINT "calls_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
