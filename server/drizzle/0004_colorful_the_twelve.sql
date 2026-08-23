CREATE TYPE "public"."material_video_source" AS ENUM('upload', 'url');--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "video_source" "material_video_source";--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "thumbnail_file_id" uuid;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "study_materials" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_thumbnail_file_id_files_id_fk" FOREIGN KEY ("thumbnail_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;