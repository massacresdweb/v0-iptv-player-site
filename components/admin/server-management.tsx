"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Server {
  id: string
  name: string
  url: string
  username: string | null
  is_active: boolean
  last_synced_at: string | null
  created_at: string
}

export function ServerManagement() {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchServers()
  }, [])

  const fetchServers = async () => {
    try {
      const response = await fetch("/api/servers")
      if (response.ok) {
        const data = await response.json()
        setServers(data.servers)
      }
    } catch (error) {
      console.error("Failed to fetch servers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddServer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          url: formData.get("url"),
          username: formData.get("username") || undefined,
          password: formData.get("password") || undefined,
        }),
      })

      if (response.ok) {
        setIsDialogOpen(false)
        fetchServers()
      }
    } catch (error) {
      console.error("Failed to add server:", error)
    }
  }

  if (loading) {
    return <div>Loading servers...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Server Management</h2>
          <p className="text-muted-foreground">Manage your IPTV servers</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Server</DialogTitle>
              <DialogDescription>Add a new IPTV server to your account</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddServer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Server Name</Label>
                <Input id="name" name="name" placeholder="My IPTV Server" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Server URL</Label>
                <Input id="url" name="url" type="url" placeholder="http://example.com:8080" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username (Optional)</Label>
                <Input id="username" name="username" placeholder="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input id="password" name="password" type="password" placeholder="password" />
              </div>
              <Button type="submit" className="w-full">
                Add Server
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <Card key={server.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{server.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{server.url}</CardDescription>
                </div>
                <Badge variant={server.is_active ? "default" : "secondary"}>
                  {server.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {server.username && (
                  <div>
                    <span className="text-muted-foreground">Username: </span>
                    <span>{server.username}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Added: </span>
                  <span>{new Date(server.created_at).toLocaleDateString()}</span>
                </div>
                {server.last_synced_at && (
                  <div>
                    <span className="text-muted-foreground">Last Synced: </span>
                    <span>{new Date(server.last_synced_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Sync
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {servers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No servers added yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Server
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
