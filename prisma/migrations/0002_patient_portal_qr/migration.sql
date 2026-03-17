CREATE TYPE "PatientPortalInviteStatus" AS ENUM ('PENDING', 'ACTIVATED', 'EXPIRED', 'REVOKED');
CREATE TYPE "QrIdentifierType" AS ENUM ('PERMANENT_IDENTITY', 'SELF_CHECK_IN', 'PORTAL_ACTIVATION', 'APPOINTMENT_CONFIRMATION', 'REPORT_ACCESS');
CREATE TYPE "QrScanStatus" AS ENUM ('SUCCESS', 'INVALID', 'EXPIRED', 'REVOKED', 'UNAUTHORIZED', 'RATE_LIMITED');
CREATE TYPE "CheckInSource" AS ENUM ('STAFF_QR', 'PATIENT_QR', 'KIOSK', 'MANUAL');
CREATE TYPE "ProfileUpdateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "patients" ADD COLUMN "portal_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "released_to_patient" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "released_at" TIMESTAMP(3);
ALTER TABLE "documents" ADD COLUMN "released_by" TEXT;
ALTER TABLE "visits" ADD COLUMN "patient_summary" TEXT;
ALTER TABLE "visits" ADD COLUMN "follow_up_instructions" TEXT;
ALTER TABLE "visits" ADD COLUMN "released_to_patient" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "visits" ADD COLUMN "released_at" TIMESTAMP(3);
ALTER TABLE "visits" ADD COLUMN "released_by" TEXT;

CREATE TABLE "patient_portal_accounts" (
  "id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "portal_enabled" BOOLEAN NOT NULL DEFAULT true,
  "activated_at" TIMESTAMP(3),
  "last_login_at" TIMESTAMP(3),
  "last_qr_issued_at" TIMESTAMP(3),
  "qr_public_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patient_portal_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patient_portal_invites" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "status" "PatientPortalInviteStatus" NOT NULL DEFAULT 'PENDING',
  "invited_by" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "activated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patient_portal_invites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patient_qr_identifiers" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "public_id" TEXT NOT NULL,
  "qr_type" "QrIdentifierType" NOT NULL,
  "token_hash" TEXT,
  "action_payload_json" JSONB,
  "expires_at" TIMESTAMP(3),
  "last_used_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patient_qr_identifiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "qr_scan_logs" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "patient_id" TEXT,
  "qr_identifier_id" TEXT,
  "scanner_user_id" TEXT,
  "scanner_role" TEXT NOT NULL,
  "qr_type" "QrIdentifierType" NOT NULL,
  "scan_context" TEXT NOT NULL,
  "status" "QrScanStatus" NOT NULL,
  "destination" TEXT,
  "ip_address" TEXT,
  "device_info" TEXT,
  "metadata_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qr_scan_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_check_in_events" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "appointment_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "source" "CheckInSource" NOT NULL,
  "scanner_user_id" TEXT,
  "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata_json" JSONB,
  CONSTRAINT "appointment_check_in_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patient_profile_update_requests" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "patient_id" TEXT NOT NULL,
  "requested_by_user_id" TEXT,
  "status" "ProfileUpdateStatus" NOT NULL DEFAULT 'PENDING',
  "requested_changes_json" JSONB NOT NULL,
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "patient_profile_update_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patient_portal_accounts_patient_id_key" ON "patient_portal_accounts"("patient_id");
CREATE UNIQUE INDEX "patient_portal_accounts_user_id_key" ON "patient_portal_accounts"("user_id");
CREATE UNIQUE INDEX "patient_portal_accounts_qr_public_id_key" ON "patient_portal_accounts"("qr_public_id");
CREATE UNIQUE INDEX "patient_portal_invites_token_hash_key" ON "patient_portal_invites"("token_hash");
CREATE UNIQUE INDEX "patient_qr_identifiers_public_id_key" ON "patient_qr_identifiers"("public_id");
CREATE INDEX "documents_workspace_id_released_to_patient_released_at_idx" ON "documents"("workspace_id", "released_to_patient", "released_at");
CREATE INDEX "visits_workspace_id_released_to_patient_released_at_idx" ON "visits"("workspace_id", "released_to_patient", "released_at");
CREATE INDEX "patient_portal_accounts_workspace_id_portal_enabled_idx" ON "patient_portal_accounts"("workspace_id", "portal_enabled");
CREATE INDEX "patient_portal_invites_workspace_id_patient_id_status_idx" ON "patient_portal_invites"("workspace_id", "patient_id", "status");
CREATE INDEX "patient_portal_invites_email_expires_at_idx" ON "patient_portal_invites"("email", "expires_at");
CREATE INDEX "patient_qr_identifiers_workspace_id_patient_id_qr_type_idx" ON "patient_qr_identifiers"("workspace_id", "patient_id", "qr_type");
CREATE INDEX "patient_qr_identifiers_public_id_revoked_at_idx" ON "patient_qr_identifiers"("public_id", "revoked_at");
CREATE INDEX "qr_scan_logs_workspace_id_created_at_idx" ON "qr_scan_logs"("workspace_id", "created_at");
CREATE INDEX "qr_scan_logs_patient_id_created_at_idx" ON "qr_scan_logs"("patient_id", "created_at");
CREATE INDEX "appointment_check_in_events_workspace_id_checked_in_at_idx" ON "appointment_check_in_events"("workspace_id", "checked_in_at");
CREATE INDEX "appointment_check_in_events_appointment_id_checked_in_at_idx" ON "appointment_check_in_events"("appointment_id", "checked_in_at");
CREATE INDEX "patient_profile_update_requests_workspace_id_patient_id_status_idx" ON "patient_profile_update_requests"("workspace_id", "patient_id", "status");

ALTER TABLE "documents" ADD CONSTRAINT "documents_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visits" ADD CONSTRAINT "visits_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patient_portal_accounts" ADD CONSTRAINT "patient_portal_accounts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_portal_accounts" ADD CONSTRAINT "patient_portal_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_portal_accounts" ADD CONSTRAINT "patient_portal_accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_portal_invites" ADD CONSTRAINT "patient_portal_invites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_portal_invites" ADD CONSTRAINT "patient_portal_invites_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_portal_invites" ADD CONSTRAINT "patient_portal_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_qr_identifiers" ADD CONSTRAINT "patient_qr_identifiers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_qr_identifiers" ADD CONSTRAINT "patient_qr_identifiers_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_qr_identifiers" ADD CONSTRAINT "patient_qr_identifiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_qr_identifier_id_fkey" FOREIGN KEY ("qr_identifier_id") REFERENCES "patient_qr_identifiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qr_scan_logs" ADD CONSTRAINT "qr_scan_logs_scanner_user_id_fkey" FOREIGN KEY ("scanner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointment_check_in_events" ADD CONSTRAINT "appointment_check_in_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_check_in_events" ADD CONSTRAINT "appointment_check_in_events_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointment_check_in_events" ADD CONSTRAINT "appointment_check_in_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_profile_update_requests" ADD CONSTRAINT "patient_profile_update_requests_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_profile_update_requests" ADD CONSTRAINT "patient_profile_update_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
