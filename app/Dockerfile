FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN corepack enable && pnpm install
COPY . .
CMD ["pnpm", "dev"]
