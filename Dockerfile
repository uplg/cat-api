FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy rest of the files
COPY . ./

RUN bun build src/index.ts --compile --outfile server

FROM debian:bookworm-slim

WORKDIR /app

# Copy only the compiled binary and config
COPY --from=builder /app/devices.json ./devices.json
COPY --from=builder /app/server ./server

# Run the binary
CMD ["./server"]