CREATE TYPE "public"."daily_submission_status" AS ENUM('submitted', 'pending_review', 'evaluated');--> statement-breakpoint
CREATE TYPE "public"."daily_task_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."daily_task_type" AS ENUM('mcq', 'truefalse', 'oneword', 'short', 'qa');--> statement-breakpoint
CREATE TABLE "daily_task_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_key" text,
	"response_text" text,
	"is_correct" boolean,
	"auto_evaluated" boolean DEFAULT false NOT NULL,
	"marks_awarded" integer
);
--> statement-breakpoint
CREATE TABLE "daily_task_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"key" text NOT NULL,
	"text" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_task_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"text" text NOT NULL,
	"marks" integer DEFAULT 1 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"correct_key" text,
	"correct_answer" text,
	"case_insensitive" boolean DEFAULT true NOT NULL,
	"explanation" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_task_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"status" "daily_submission_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"score" integer,
	"total_marks" integer DEFAULT 0 NOT NULL,
	"percentage" numeric(5, 2),
	"feedback" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"type" "daily_task_type" DEFAULT 'mcq' NOT NULL,
	"class_id" uuid NOT NULL,
	"class_name" text NOT NULL,
	"subject_id" uuid,
	"subject_name" text,
	"chapter_id" uuid,
	"chapter_title" text,
	"task_date" date DEFAULT current_date NOT NULL,
	"time_limit_minutes" integer DEFAULT 0 NOT NULL,
	"total_marks" integer DEFAULT 0 NOT NULL,
	"status" "daily_task_status" DEFAULT 'draft' NOT NULL,
	"allow_reattempt" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_task_answers" ADD CONSTRAINT "daily_task_answers_submission_id_daily_task_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."daily_task_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_task_answers" ADD CONSTRAINT "daily_task_answers_question_id_daily_task_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."daily_task_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_task_options" ADD CONSTRAINT "daily_task_options_question_id_daily_task_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."daily_task_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_task_questions" ADD CONSTRAINT "daily_task_questions_task_id_daily_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."daily_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_task_submissions" ADD CONSTRAINT "daily_task_submissions_task_id_daily_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."daily_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_task_submissions" ADD CONSTRAINT "daily_task_submissions_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_task_submissions" ADD CONSTRAINT "daily_task_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_tasks" ADD CONSTRAINT "daily_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dt_answer_submission" ON "daily_task_answers" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "idx_dt_option_question" ON "daily_task_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_dt_question_task" ON "daily_task_questions" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_dt_submission" ON "daily_task_submissions" USING btree ("task_id","student_user_id","attempt_no");--> statement-breakpoint
CREATE INDEX "idx_dt_submission_student" ON "daily_task_submissions" USING btree ("student_user_id");