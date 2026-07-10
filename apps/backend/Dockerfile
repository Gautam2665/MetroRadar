# apps/backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY database/prisma ./database/prisma/

RUN npm ci

COPY apps/backend ./apps/backend

# Generate Prisma client before building to ensure classes are typed correctly
RUN npx prisma generate --schema=database/prisma/schema.prisma

RUN npm run build --workspace=apps/backend

# Production image
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY database/prisma ./database/prisma/

RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3001

CMD ["npm", "run", "start:prod", "--workspace=apps/backend"]
