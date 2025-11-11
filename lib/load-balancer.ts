import { db } from "./db"

interface Server {
  id: number
  host: string
  status: string
  metrics?: {
    cpu: number
    memory: number
    latency: number
  }
}

interface ServerMetrics {
  responseTime: number
  failureCount: number
  lastCheck: number
  successRate: number
}

const serverMetrics = new Map<string, ServerMetrics>()

export async function selectOptimalServer(): Promise<string | null> {
  const servers = (await db.getAllServers()) as Server[]
  const activeServers = servers.filter((s) => s.status === "active" || !s.status)

  if (activeServers.length === 0) {
    return null
  }

  // Update metrics and score
  const scoredServers = activeServers.map((server) => {
    const metrics = serverMetrics.get(server.host) || {
      responseTime: 100,
      failureCount: 0,
      lastCheck: Date.now(),
      successRate: 100,
    }

    // Score calculation: response time (40%), success rate (40%), load (20%)
    const responseScore = Math.max(0, 100 - metrics.responseTime)
    const successScore = metrics.successRate
    const loadScore = 100 - ((server.metrics?.cpu || 50) * 0.6 + (server.metrics?.memory || 50) * 0.4)

    const totalScore = responseScore * 0.4 + successScore * 0.4 + loadScore * 0.2

    return { server, score: totalScore, metrics }
  })

  scoredServers.sort((a, b) => b.score - a.score)

  // Return best server
  return scoredServers[0].server.host
}

export function recordServerSuccess(host: string, responseTime: number): void {
  const current = serverMetrics.get(host) || {
    responseTime: 100,
    failureCount: 0,
    lastCheck: Date.now(),
    successRate: 100,
  }

  serverMetrics.set(host, {
    responseTime: Math.round(current.responseTime * 0.7 + responseTime * 0.3),
    failureCount: Math.max(0, current.failureCount - 1),
    lastCheck: Date.now(),
    successRate: Math.min(100, current.successRate + 2),
  })
}

export function recordServerFailure(host: string): void {
  const current = serverMetrics.get(host) || {
    responseTime: 100,
    failureCount: 0,
    lastCheck: Date.now(),
    successRate: 100,
  }

  serverMetrics.set(host, {
    ...current,
    failureCount: current.failureCount + 1,
    successRate: Math.max(0, current.successRate - 10),
    lastCheck: Date.now(),
  })
}
