/*
  Warnings:

  - A unique constraint covering the columns `[userId,nickname]` on the table `Beneficiary` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Beneficiary_userId_nickname_key" ON "Beneficiary"("userId", "nickname");
