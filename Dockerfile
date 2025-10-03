# ---- Giai đoạn Base ----
# Chuẩn bị môi trường có pnpm
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# ---- Giai đoạn cài Dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --ignore-scripts --frozen-lockfile

# ---- Giai đoạn Build ----
# Build ứng dụng NestJS
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN npx prisma generate

# Copy toàn bộ source code và build
COPY . .
RUN pnpm exec nest build

# ---- Giai đoạn Production ----
# Tạo image cuối cùng, siêu nhẹ để chạy
FROM node:20-alpine AS production
WORKDIR /app

# Copy code đã build và Prisma client từ giai đoạn 'builder'
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy các dependencies production từ giai đoạn 'deps'
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy file .env để có environment variables
COPY .env .env

# Copy email templates cho production
COPY src/3rdService/mail/templates ./dist/3rdService/mail/templates

# Set environment variable for production
ENV NODE_ENV=production

EXPOSE 3000

# Lệnh khởi chạy ứng dụng
CMD ["node", "dist/src/main.js"]