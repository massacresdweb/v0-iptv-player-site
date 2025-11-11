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

export async function selectBestServer(): Promise<string | null> {
  const servers = (await db.getAllServers()) as Server[]

  const activeServers = servers.filter((s) => s.status === "active" && s.metrics)

  if (activeServers.length === 0) {
    return null
  }

  // Score based on CPU, memory, and latency
  const scored = activeServers.map((server) => {
    const cpuScore = 100 - (server.metrics?.cpu || 100)
    const memScore = 100 - (server.metrics?.memory || 100)
    const latScore = Math.max(0, 100 - (server.metrics?.latency || 1000) / 10)

    const totalScore = cpuScore * 0.4 + memScore * 0.3 + latScore * 0.3

    return { server, score: totalScore }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored[0].server.host
}
