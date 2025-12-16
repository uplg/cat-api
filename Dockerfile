FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . ./

RUN bun build src/index.ts --compile --outfile server

FROM debian:trixie-slim

WORKDIR /app

# Copy only the compiled binary and config
COPY --from=builder /app/devices.json ./devices.json
COPY --from=builder /app/device-cache.json ./device-cache.json
COPY --from=builder /app/users.json ./users.json
COPY --from=builder /app/server ./server

CMD ["./server"]