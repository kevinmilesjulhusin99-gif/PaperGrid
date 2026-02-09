-- CreateTable
CREATE TABLE "DailyView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyView_date_postId_key" ON "DailyView"("date", "postId");

-- CreateIndex
CREATE INDEX "DailyView_date_idx" ON "DailyView"("date");

-- CreateIndex
CREATE INDEX "DailyView_postId_idx" ON "DailyView"("postId");

-- Backfill existing ViewCount into today's trend bucket (UTC)
INSERT INTO "DailyView" ("id", "postId", "date", "views", "createdAt", "updatedAt")
SELECT
  lower(hex(randomblob(16))),
  "postId",
  CAST(strftime('%s', 'now', 'utc', 'start of day') AS INTEGER) * 1000,
  "count",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "ViewCount"
WHERE "count" > 0;
