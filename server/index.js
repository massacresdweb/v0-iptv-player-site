import express from "express"
import cors from "cors"
import helmet from "helmet"
import compression from "compression"
import rateLimit from "express-rate-limit"
import { createServer } from "http"
import { Server } from "socket.io"
import authRoutes from "./routes/auth.js"
import channelRoutes from "./routes/channels.js"
import streamRoutes from "./routes/stream.js"
import adminRoutes from "./routes/admin.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { securityMiddleware } from "./middleware/security.js"
import { RedisCache } from "./utils/redis.js"
import { DatabasePool } from "./utils/database.js"

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
  transports: ["websocket", "polling"],
})

// Ultra-fast middleware stack
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
)
app.use(compression({ level: 6 }))
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Security middleware
app.use(securityMiddleware)

// Rate limiting - aggressive for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith("/api/stream"), // No limit on streaming
})
app.use("/api", limiter)

// Initialize Redis and Database
await RedisCache.connect()
await DatabasePool.initialize()

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/channels", channelRoutes)
app.use("/api/stream", streamRoutes)
app.use("/api/admin", adminRoutes)

// Health check
app.get("/health", async (req, res) => {
  const redisStatus = await RedisCache.ping()
  const dbStatus = await DatabasePool.ping()
  res.json({
    status: "ok",
    redis: redisStatus,
    database: dbStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  })
})

// WebSocket for real-time updates
io.on("connection", (socket) => {
  console.log("[v0] Client connected:", socket.id)

  socket.on("join-channel", async (channelId) => {
    socket.join(`channel-${channelId}`)
    await RedisCache.incrementViewers(channelId)
    io.to(`channel-${channelId}`).emit("viewer-count", await RedisCache.getViewers(channelId))
  })

  socket.on("leave-channel", async (channelId) => {
    socket.leave(`channel-${channelId}`)
    await RedisCache.decrementViewers(channelId)
    io.to(`channel-${channelId}`).emit("viewer-count", await RedisCache.getViewers(channelId))
  })

  socket.on("disconnect", () => {
    console.log("[v0] Client disconnected:", socket.id)
  })
})

// Error handler
app.use(errorHandler)

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`[v0] 🚀 Ultra-Fast IPTV Server running on port ${PORT}`)
  console.log(`[v0] 💾 Redis: ${RedisCache.isConnected() ? "Connected" : "Disconnected"}`)
  console.log(`[v0] 🗄️  Database: ${DatabasePool.isConnected() ? "Connected" : "Disconnected"}`)
})

export { io }
