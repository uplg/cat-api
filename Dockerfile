FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
# Install without noble (Bluetooth not supported in Docker)
RUN bun install --frozen-lockfile --ignore-scripts

COPY . ./

# Build without Bluetooth dependencies
RUN bun build src/index.ts --compile --outfile server --external @stoprocent/noble

FROM debian:trixie-slim

WORKDIR /app

# Disable Bluetooth in Docker
ENV DISABLE_BLUETOOTH=true

# Copy only the compiled binary and config
COPY --from=builder /app/devices.json ./devices.json
COPY --from=builder /app/device-cache.json ./device-cache.json
COPY --from=builder /app/users.json ./users.json
COPY --from=builder /app/server ./server

CMD ["./server"]