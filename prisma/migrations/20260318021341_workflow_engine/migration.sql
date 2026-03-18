-- CreateEnum
CREATE TYPE "PatientAdminState" AS ENUM ('NEW', 'REGISTERED', 'PORTAL_INVITED', 'PORTAL_ACTIVE');

-- CreateEnum
CREATE TYPE "PatientFlowState" AS ENUM ('SCHEDULED', 'CONFIRMED', 'ARRIVED', 'READY_FOR_PROVIDER', 'IN_CONSULTATION', 'SENT_TO_LAB', 'WAITING_FOR_RESULT', 'REVIEWED', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('ORDERED', 'SAMPLE_COLLECTED', 'PROCESSING', 'RESULT_UPLOADED', 'DOCTOR_REVIEW_PENDING', 'DOCTOR_REVIEWED', 'RELEASED_TO_PATIENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClinicalDocumentState" AS ENUM ('DRAFT', 'SIGNED', 'RELEASED_TO_PATIENT', 'ARCHIVED');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "arrived_at" TIMESTAMP(3),
ADD COLUMN     "checked_out_at" TIMESTAMP(3),
ADD COLUMN     "flow_state" "PatientFlowState" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "ready_for_provider_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "clinical_state" "ClinicalDocumentState" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "admin_state" "PatientAdminState" NOT NULL DEFAULT 'REGISTERED';

-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "started_consultation_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "visit_id" TEXT,
    "ordered_by_doctor_id" TEXT NOT NULL,
    "processed_by_user_id" TEXT,
    "test_name" TEXT NOT NULL,
    "indication" TEXT,
    "notes" TEXT,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "result_document_id" TEXT,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sample_collected_at" TIMESTAMP(3),
    "processing_started_at" TIMESTAMP(3),
    "result_uploaded_at" TIMESTAMP(3),
    "doctor_reviewed_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_result_document_id_key" ON "lab_orders"("result_document_id");

-- CreateIndex
CREATE INDEX "lab_orders_workspace_id_patient_id_status_idx" ON "lab_orders"("workspace_id", "patient_id", "status");

-- CreateIndex
CREATE INDEX "lab_orders_workspace_id_ordered_by_doctor_id_status_idx" ON "lab_orders"("workspace_id", "ordered_by_doctor_id", "status");

-- CreateIndex
CREATE INDEX "lab_orders_workspace_id_appointment_id_idx" ON "lab_orders"("workspace_id", "appointment_id");

-- CreateIndex
CREATE INDEX "appointments_workspace_id_flow_state_scheduled_at_idx" ON "appointments"("workspace_id", "flow_state", "scheduled_at");

-- CreateIndex
CREATE INDEX "documents_workspace_id_clinical_state_released_at_idx" ON "documents"("workspace_id", "clinical_state", "released_at");

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordered_by_doctor_id_fkey" FOREIGN KEY ("ordered_by_doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_processed_by_user_id_fkey" FOREIGN KEY ("processed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_result_document_id_fkey" FOREIGN KEY ("result_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "patient_profile_update_requests_workspace_id_patient_id_status_" RENAME TO "patient_profile_update_requests_workspace_id_patient_id_sta_idx";
