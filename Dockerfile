# Application Docker file Configuration
# Visit https://docs.docker.com/engine/reference/builder/
# Using multi stage build

# Prepare the image when build
# also use to minimize the docker image
FROM node:20-alpine as builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Generate Prisma client
RUN pnpm prisma:generate
# Build the application
RUN pnpm run build


# Build the image as production
# So we can minimize the size
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
ENV PORT=8080
ENV NODE_ENV=Production
# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma
# Install dependencies and generate Prisma client in one layer
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm add -D prisma@6.8.2 && \
    pnpm exec prisma generate
# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.json ./
# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE ${PORT}
ENTRYPOINT ["./docker-entrypoint.sh"] # Dùng entrypoint này

CMD ["node", "dist/main.js"]