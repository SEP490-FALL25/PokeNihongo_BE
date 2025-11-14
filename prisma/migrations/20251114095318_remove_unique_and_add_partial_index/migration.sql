-- This is an empty migration.
-- Tạo Partial Unique Index (Chỉ áp dụng cho các hàng chưa bị xoá)
CREATE UNIQUE INDEX "SubscriptionFeature_subscriptionId_featureId_active_idx"
ON "SubscriptionFeature" ("subscriptionId", "featureId")
WHERE "deletedAt" IS NULL;
