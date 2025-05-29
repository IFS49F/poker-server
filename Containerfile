FROM node:22.16.0-bookworm-slim AS deps
WORKDIR /workspace
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

FROM gcr.io/distroless/nodejs22-debian12
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE ${PORT}
WORKDIR /workspace
COPY package.json ./
COPY --from=deps /workspace/node_modules/ ./node_modules
COPY public/ ./public/
COPY index.js ./
COPY app/ ./app/
CMD ["index.js"]
