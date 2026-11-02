-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "resolvedAt" TIMESTAMP(3);

-- Tickets ya resueltos/cerrados: se toma la última actualización como aproximación
UPDATE "Ticket" SET "resolvedAt" = "updatedAt" WHERE "status" IN ('RESUELTO', 'CERRADO');
