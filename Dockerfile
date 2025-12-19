# Build the image as production
# So we can minimize the size
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Install ffmpeg system binary for audio conversion (MP4/M4A to FLAC)
# Note: npm package "ffmpeg" is just a wrapper, we need the actual system binary
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
ENV PORT=8080
ENV NODE_ENV=Production

# Copy Prisma schema
COPY prisma ./prisma

# Install dependencies and generate Prisma client in one layer
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm add -D prisma@6.8.2 && \
    pnpm exec prisma generate

# ---- THAY ĐỔI QUAN TRỌNG ----
# Copy thư mục 'dist' bạn đã upload từ VPS vào image
COPY dist ./dist
# -----------------------------
# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && \
    sed -i 's/\r$//' docker-entrypoint.sh
EXPOSE ${PORT}
ENTRYPOINT ["./docker-entrypoint.sh"]

# Khôi phục CMD
CMD ["node", "dist/src/main.js"]