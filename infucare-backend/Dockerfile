# STAGE 1: BUILDER (Compile kode Go)
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copy go.mod & go.sum lebih dulu untuk caching layer
COPY go.mod go.sum ./
RUN go mod download

# Copy seluruh source code backend
COPY . .

# Compile main.go yang berada di .cmd/api/main.go menjadi binary 'infucare-server'
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o infucare-server ./cmd/api/main.go

# STAGE 2: RUNNER (Image produksi ringan)
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Jakarta

WORKDIR /root/

# Salin binary hasil compile dari State 1
COPY --from=builder /app/infucare-server .

EXPOSE 8080

CMD ["./infucare-server"]