"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Server, Tv, Activity } from "lucide-react"

interface Stats {
  totalUsers: number
  totalServers: number
  totalChannels: number
  activeUsers: number
}

export function SystemStats() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalServers: 0,
    totalChannels: 0,
    activeUsers: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: "Registered accounts",
    },
    {
      title: "Total Servers",
      value: stats.totalServers,
      icon: Server,
      description: "Connected IPTV servers",
    },
    {
      title: "Total Channels",
      value: stats.totalChannels,
      icon: Tv,
      description: "Available channels",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: Activity,
      description: "Users online now",
    },
  ]

  if (loading) {
    return <div>Loading statistics...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Dashboard</h2>
        <p className="text-muted-foreground">Overview of your IPTV platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
