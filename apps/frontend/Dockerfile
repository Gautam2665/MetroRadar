# apps/frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

RUN npm ci

COPY apps/frontend ./apps/frontend

RUN npm run build --workspace=apps/frontend

# Production image
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/

RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /usr/src/app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "run", "start", "--workspace=apps/frontend"]
