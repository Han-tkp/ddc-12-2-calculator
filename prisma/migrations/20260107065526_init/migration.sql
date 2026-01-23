-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "label_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "C" REAL NOT NULL,
    "S" REAL NOT NULL,
    "RA" REAL NOT NULL,
    "RA_unit" TEXT NOT NULL,
    "A0" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "label_profiles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calculations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "profileId" TEXT,
    "C" REAL NOT NULL,
    "S" REAL NOT NULL,
    "RA" REAL NOT NULL,
    "RA_unit" TEXT NOT NULL,
    "A0" REAL NOT NULL,
    "A_house" REAL NOT NULL,
    "N" INTEGER NOT NULL,
    "V_per_house" REAL NOT NULL,
    "V_total" REAL NOT NULL,
    "V_C" REAL NOT NULL,
    "V_S" REAL NOT NULL,
    "V_C_1L" REAL NOT NULL,
    "notes" TEXT,
    "location" TEXT,
    "chemical" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "calculations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "calculations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "label_profiles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "label_profiles_name_key" ON "label_profiles"("name");

-- CreateIndex
CREATE INDEX "calculations_userId_idx" ON "calculations"("userId");

-- CreateIndex
CREATE INDEX "calculations_profileId_idx" ON "calculations"("profileId");
