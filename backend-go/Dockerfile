FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod .
COPY go.sum .
RUN go mod download
COPY . .
RUN go build -o /chatter-backend-go ./

FROM alpine:3.18
RUN apk add --no-cache ca-certificates
COPY --from=build /chatter-backend-go /chatter-backend-go
ENV PORT=8000
EXPOSE 8000
CMD ["/chatter-backend-go"]
