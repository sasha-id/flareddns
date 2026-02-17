# Stage 1: Build React client
FROM node:20-alpine AS client-build
WORKDIR /build
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --workspace=client
COPY client/ client/
RUN npm run build --workspace=client

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --workspace=server --omit=dev
COPY server/ server/
COPY --from=client-build /build/client/dist client/dist/
RUN mkdir -p data && chown node:node data
EXPOSE 8080
USER node
CMD ["node", "server/src/index.js"]
