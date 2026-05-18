-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL DEFAULT ('req_' || lower(hex(randomblob(4))) || '_' || lower(hex(randomblob(3)))),
    "userId" TEXT,
    "email" TEXT,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Verification" ("code", "createdAt", "email", "expiresAt", "id", "userId") SELECT "code", "createdAt", "email", "expiresAt", "id", "userId" FROM "Verification";
DROP TABLE "Verification";
ALTER TABLE "new_Verification" RENAME TO "Verification";
CREATE UNIQUE INDEX "Verification_requestId_key" ON "Verification"("requestId");
CREATE UNIQUE INDEX "Verification_userId_key" ON "Verification"("userId");
CREATE INDEX "Verification_email_idx" ON "Verification"("email");
CREATE INDEX "Verification_requestId_idx" ON "Verification"("requestId");
CREATE INDEX "Verification_status_idx" ON "Verification"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
