# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Build-time environment variable for Next.js public runtime config
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_CHROME_EXTENSION_URL=https://chromewebstore.google.com
ARG NEXT_PUBLIC_EDGE_EXTENSION_URL=https://microsoftedge.microsoft.com/addons
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CHROME_EXTENSION_URL=$NEXT_PUBLIC_CHROME_EXTENSION_URL
ENV NEXT_PUBLIC_EDGE_EXTENSION_URL=$NEXT_PUBLIC_EDGE_EXTENSION_URL

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
