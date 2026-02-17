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
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh
EXPOSE ${PORT:-8080}
CMD ["./entrypoint.sh"]
