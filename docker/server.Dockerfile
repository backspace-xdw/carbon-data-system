FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/tsconfig.json server/
COPY server/prisma server/prisma
RUN npm install --workspaces --include-workspace-root
COPY server/src server/src
RUN npm run prisma:generate -w iecsp-server \
 && npm run build -w iecsp-server

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/server/node_modules /app/server/node_modules
COPY --from=builder /app/server/dist /app/server/dist
COPY --from=builder /app/server/prisma /app/server/prisma
COPY --from=builder /app/server/package.json /app/server/package.json
COPY web /app/web
EXPOSE 7090
WORKDIR /app/server
CMD ["node", "dist/main.js"]
