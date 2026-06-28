# Build and serve frontend
FROM node:22-alpine as frontend-builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
COPY shared ./shared
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

# Build backend
FROM node:22-alpine as backend-builder
WORKDIR /app
COPY backend/package*.json ./backend/
COPY shared ./shared
RUN cd backend && npm install
COPY backend ./backend
RUN cd backend && npm run build

# Final image
FROM node:22-alpine
WORKDIR /app

# Copy frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy backend
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/dist/backend ./dist/backend
COPY --from=backend-builder /app/backend/dist/shared ./dist/shared

# Run everything from backend directory
WORKDIR /app/backend

# Need a simple static server to serve frontend concurrently if not relying on nginx
RUN npm install -g serve concurrently

# Env setup
ENV NODE_ENV=production
ENV PORT=3000
# NOTE: JWT_SECRET MUST BE PROVIDED VIA RUNTIME ENV
ENV ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173,http://localhost:8080"

EXPOSE 3000
EXPOSE 8080

CMD ["npx", "concurrently", "\"serve -s ../frontend/dist -p 8080\"", "\"node ../dist/backend/src/server.js\""]
