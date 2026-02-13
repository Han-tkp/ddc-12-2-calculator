CREATE TABLE IF NOT EXISTS "feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "organization" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "formulaData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "contact" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
