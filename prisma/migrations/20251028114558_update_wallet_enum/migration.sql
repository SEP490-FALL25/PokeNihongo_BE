-- 🔧 1. Tạm chuyển cột sang TEXT để tránh lỗi enum
ALTER TABLE "Wallet" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Wallet" ALTER COLUMN "type" TYPE TEXT USING "type"::text;

-- 🔧 2. Cập nhật dữ liệu cũ sang giá trị mới
UPDATE "Wallet" SET "type" = 'POKE_COINS' WHERE "type" = 'COIN';
UPDATE "Wallet" SET "type" = 'SPARKLES' WHERE "type" = 'FREE_COIN';

-- 🔧 3. Xóa enum cũ và tạo enum mới
DROP TYPE IF EXISTS "WalletType";
CREATE TYPE "WalletType" AS ENUM ('SPARKLES', 'POKE_COINS');

-- 🔧 4. Đổi cột type trở lại dùng enum mới
ALTER TABLE "Wallet"
ALTER COLUMN "type" TYPE "WalletType" USING "type"::text::"WalletType";

-- 🔧 5. Đặt lại default
ALTER TABLE "Wallet" ALTER COLUMN "type" SET DEFAULT 'SPARKLES';
