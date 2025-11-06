"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LogOut, Plus, Trash2, Ban, CheckCircle, Key, Database, Server } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [keys, setKeys] = useState<any[]>([])
  const [m3uSources, setM3uSources] = useState<any[]>([])
  const [servers, setServers] = useState<any[]>([])
  const [newKeyDuration, setNewKeyDuration] = useState("7")
  const [selectedM3U, setSelectedM3U] = useState("")

  const [sourceType, setSourceType] = useState<"m3u" | "xtream">("m3u")
  const [newM3UName, setNewM3UName] = useState("")
  const [newM3UUrl, setNewM3UUrl] = useState("")
  const [xtreamServer, setXtreamServer] = useState("")
  const [xtreamUsername, setXtreamUsername] = useState("")
  const [xtreamPassword, setXtreamPassword] = useState("")
  const [xtreamPort, setXtreamPort] = useState("80")

  const [newServerName, setNewServerName] = useState("")
  const [newServerUrl, setNewServerUrl] = useState("")
  const [newServerLocation, setNewServerLocation] = useState("")

  useEffect(() => {
    checkAuth()
    fetchKeys()
    fetchM3USources()
    fetchServers()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/admin/login", {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        toast.error("Oturum süresi dolmuş. Lütfen tekrar giriş yapın.")
        router.push("/admin/login")
        return
      }

      const data = await response.json()
      if (!data.success) {
        router.push("/admin/login")
      }
    } catch (error) {
      console.error("[v0] Auth check failed:", error)
      toast.error("Kimlik doğrulama hatası")
      router.push("/admin/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchKeys = async () => {
    try {
      const response = await fetch("/api/admin/keys")
      if (response.ok) {
        const data = await response.json()
        setKeys(data.keys || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch keys:", error)
    }
  }

  const fetchM3USources = async () => {
    try {
      const response = await fetch("/api/admin/m3u")
      if (response.ok) {
        const data = await response.json()
        setM3uSources(data.sources || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch M3U sources:", error)
    }
  }

  const createKey = async () => {
    if (!selectedM3U) {
      toast.error("Lütfen bir M3U kaynağı seçin")
      return
    }

    try {
      const response = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          m3uSourceId: Number.parseInt(selectedM3U),
          durationDays: Number.parseInt(newKeyDuration),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`KEY oluşturuldu: ${data.key}`)
        fetchKeys()
      } else {
        toast.error("KEY oluşturulamadı")
      }
    } catch (error) {
      toast.error("Bağlantı hatası")
    }
  }

  const toggleBanKey = async (keyId: number, currentBanStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/keys`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, isBanned: !currentBanStatus }),
      })

      if (response.ok) {
        toast.success(currentBanStatus ? "KEY ban kaldırıldı" : "KEY banlandı")
        fetchKeys()
      }
    } catch (error) {
      toast.error("İşlem başarısız")
    }
  }

  const deleteKey = async (keyId: number) => {
    if (!confirm("Bu KEY'i silmek istediğinizden emin misiniz?")) return

    try {
      const response = await fetch(`/api/admin/keys?keyId=${keyId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("KEY silindi")
        fetchKeys()
      }
    } catch (error) {
      toast.error("Silme işlemi başarısız")
    }
  }

  const addM3USource = async () => {
    if (!newM3UName) {
      toast.error("Kaynak adı gerekli")
      return
    }

    if (sourceType === "m3u" && !newM3UUrl) {
      toast.error("M3U URL gerekli")
      return
    }

    if (sourceType === "xtream" && (!xtreamServer || !xtreamUsername || !xtreamPassword)) {
      toast.error("Xtream Codes için tüm alanları doldurun")
      return
    }

    const loadingToast = toast.loading(
      sourceType === "xtream" ? "Xtream Codes kaynağı ekleniyor..." : "M3U kaynağı ekleniyor...",
    )

    try {
      const requestBody =
        sourceType === "xtream"
          ? {
              name: newM3UName,
              sourceType: "xtream",
              xtreamServer,
              xtreamUsername,
              xtreamPassword,
              xtreamPort: Number.parseInt(xtreamPort) || 80,
            }
          : {
              name: newM3UName,
              sourceType: "m3u",
              url: newM3UUrl,
            }

      console.log("[v0] Adding source:", {
        ...requestBody,
        xtreamPassword: requestBody.xtreamPassword ? "***" : undefined,
      })

      const response = await fetch("/api/admin/m3u", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        credentials: "include",
      })

      const data = await response.json()
      console.log("[v0] Source add response:", { ok: response.ok, status: response.status, data })

      if (response.ok) {
        toast.success("Kaynak başarıyla eklendi", { id: loadingToast })
        setNewM3UName("")
        setNewM3UUrl("")
        setXtreamServer("")
        setXtreamUsername("")
        setXtreamPassword("")
        setXtreamPort("80")
        fetchM3USources()
      } else {
        toast.error(data.error || "Kaynak eklenemedi", { id: loadingToast })
      }
    } catch (error) {
      console.error("[v0] Source add error:", error)
      toast.error("Bağlantı hatası: " + (error instanceof Error ? error.message : "Bilinmeyen hata"), {
        id: loadingToast,
      })
    }
  }

  const fetchServers = async () => {
    try {
      const response = await fetch("/api/admin/servers")
      if (response.ok) {
        const data = await response.json()
        setServers(data.servers || [])
      }
    } catch (error) {
      console.error("[v0] Failed to fetch servers:", error)
    }
  }

  const addServer = async () => {
    if (!newServerName || !newServerUrl) {
      toast.error("Sunucu adı ve URL gerekli")
      return
    }

    try {
      const response = await fetch("/api/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServerName,
          url: newServerUrl,
          location: newServerLocation || "Unknown",
        }),
      })

      if (response.ok) {
        toast.success("Sunucu eklendi")
        setNewServerName("")
        setNewServerUrl("")
        setNewServerLocation("")
        fetchServers()
      }
    } catch (error) {
      toast.error("Sunucu eklenemedi")
    }
  }

  const deleteServer = async (serverId: number) => {
    if (!confirm("Bu sunucuyu silmek istediğinizden emin misiniz?")) return

    try {
      const response = await fetch(`/api/admin/servers?serverId=${serverId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Sunucu silindi")
        fetchServers()
      }
    } catch (error) {
      toast.error("Sunucu silinemedi")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" })
      toast.success("Çıkış yapıldı")
      router.push("/admin/login")
    } catch (error) {
      toast.error("Çıkış yapılırken hata oluştu")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              MASSTV Admin
            </h1>
            <p className="text-sm text-slate-400">Yönetim Paneli</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-slate-700 text-white hover:bg-slate-800 bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="keys" className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="keys" className="data-[state=active]:bg-slate-800">
              <Key className="h-4 w-4 mr-2" />
              KEY Yönetimi
            </TabsTrigger>
            <TabsTrigger value="m3u" className="data-[state=active]:bg-slate-800">
              <Database className="h-4 w-4 mr-2" />
              M3U Kaynakları
            </TabsTrigger>
            <TabsTrigger value="servers" className="data-[state=active]:bg-slate-800">
              <Server className="h-4 w-4 mr-2" />
              Sunucular
            </TabsTrigger>
          </TabsList>

          <TabsContent value="keys" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Yeni KEY Oluştur</CardTitle>
                <CardDescription className="text-slate-400">Kullanıcılar için süre bazlı KEY oluşturun</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Süre</Label>
                    <Select value={newKeyDuration} onValueChange={setNewKeyDuration}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="7">1 Hafta</SelectItem>
                        <SelectItem value="30">1 Ay</SelectItem>
                        <SelectItem value="90">3 Ay</SelectItem>
                        <SelectItem value="365">1 Yıl</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">M3U Kaynağı</Label>
                    <Select value={selectedM3U} onValueChange={setSelectedM3U}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Kaynak seçin" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {m3uSources.map((source) => (
                          <SelectItem key={source.id} value={source.id.toString()}>
                            {source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={createKey} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      KEY Oluştur
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Aktif KEY'ler ({keys.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">KEY</TableHead>
                      <TableHead className="text-slate-400">M3U Kaynağı</TableHead>
                      <TableHead className="text-slate-400">Oluşturulma</TableHead>
                      <TableHead className="text-slate-400">Son Kullanma</TableHead>
                      <TableHead className="text-slate-400">Durum</TableHead>
                      <TableHead className="text-slate-400">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key.id} className="border-slate-800">
                        <TableCell className="font-mono text-white">{key.key_value}</TableCell>
                        <TableCell className="text-slate-300">{key.m3u_name}</TableCell>
                        <TableCell className="text-slate-400">
                          {new Date(key.created_at).toLocaleDateString("tr-TR")}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {new Date(key.expires_at).toLocaleDateString("tr-TR")}
                        </TableCell>
                        <TableCell>
                          {key.is_banned ? (
                            <Badge variant="destructive">Banlı</Badge>
                          ) : new Date(key.expires_at) < new Date() ? (
                            <Badge variant="secondary">Süresi Dolmuş</Badge>
                          ) : (
                            <Badge className="bg-green-600">Aktif</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={key.is_banned ? "outline" : "destructive"}
                              onClick={() => toggleBanKey(key.id, key.is_banned)}
                            >
                              {key.is_banned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteKey(key.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="m3u" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Yeni Kaynak Ekle</CardTitle>
                <CardDescription className="text-slate-400">
                  M3U URL veya Xtream Codes ile playlist ekleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as "m3u" | "xtream")}>
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                    <TabsTrigger value="m3u">M3U URL</TabsTrigger>
                    <TabsTrigger value="xtream">Xtream Codes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="m3u" className="space-y-4 mt-4">
                    <Input
                      placeholder="Kaynak Adı"
                      value={newM3UName}
                      onChange={(e) => setNewM3UName(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                    <Input
                      placeholder="M3U URL (http://...)"
                      value={newM3UUrl}
                      onChange={(e) => setNewM3UUrl(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </TabsContent>

                  <TabsContent value="xtream" className="space-y-4 mt-4">
                    <Input
                      placeholder="Kaynak Adı"
                      value={newM3UName}
                      onChange={(e) => setNewM3UName(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Server (http://domain.com)"
                        value={xtreamServer}
                        onChange={(e) => setXtreamServer(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <Input
                        placeholder="Port (varsayılan: 80)"
                        value={xtreamPort}
                        onChange={(e) => setXtreamPort(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <Input
                        placeholder="Kullanıcı Adı"
                        value={xtreamUsername}
                        onChange={(e) => setXtreamUsername(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <Input
                        type="password"
                        placeholder="Şifre"
                        value={xtreamPassword}
                        onChange={(e) => setXtreamPassword(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                {/* </CHANGE> */}

                <Button onClick={addM3USource} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Ekle ve Analiz Et
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Kaynaklar ({m3uSources.length})</CardTitle>
                <CardDescription className="text-slate-400">M3U ve Xtream Codes kaynakları</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Kaynak Adı</TableHead>
                      <TableHead className="text-slate-400">Tip</TableHead>
                      <TableHead className="text-slate-400">Canlı TV</TableHead>
                      <TableHead className="text-slate-400">Filmler</TableHead>
                      <TableHead className="text-slate-400">Diziler</TableHead>
                      <TableHead className="text-slate-400">Toplam</TableHead>
                      <TableHead className="text-slate-400">Oluşturulma</TableHead>
                      <TableHead className="text-slate-400">Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {m3uSources.map((source) => {
                      const calculatedTotal = source.stats
                        ? source.stats.liveChannels + source.stats.movies + source.stats.series
                        : 0
                      const displayTotal = source.stats?.totalChannels || calculatedTotal

                      return (
                        <TableRow key={source.id} className="border-slate-800">
                          <TableCell className="text-white font-medium">{source.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-blue-500 text-blue-400">
                              {source.source_type === "xtream" ? "Xtream" : "M3U"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-blue-400">
                            {source.stats ? `${source.stats.liveChannels} kanal` : "Analiz ediliyor..."}
                          </TableCell>
                          <TableCell className="text-purple-400">
                            {source.stats ? `${source.stats.movies} film` : "-"}
                          </TableCell>
                          <TableCell className="text-green-400">
                            {source.stats ? `${source.stats.series} dizi` : "-"}
                          </TableCell>
                          <TableCell className="text-white font-bold">{source.stats ? displayTotal : "-"}</TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(source.created_at).toLocaleDateString("tr-TR")}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600">Aktif</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="servers" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Yeni Sunucu Ekle</CardTitle>
                <CardDescription className="text-slate-400">
                  Load balancing için stream sunucuları ekleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Sunucu Adı"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Sunucu URL"
                    value={newServerUrl}
                    onChange={(e) => setNewServerUrl(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <Input
                    placeholder="Lokasyon (opsiyonel)"
                    value={newServerLocation}
                    onChange={(e) => setNewServerLocation(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <Button onClick={addServer} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Sunucular ({servers.length})</CardTitle>
                <CardDescription className="text-slate-400">
                  Yük dağılımı için kullanılan stream sunucuları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">ID</TableHead>
                      <TableHead className="text-slate-400">Sunucu Adı</TableHead>
                      <TableHead className="text-slate-400">URL</TableHead>
                      <TableHead className="text-slate-400">Lokasyon</TableHead>
                      <TableHead className="text-slate-400">Durum</TableHead>
                      <TableHead className="text-slate-400">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servers.map((server) => (
                      <TableRow key={server.id} className="border-slate-800">
                        <TableCell className="text-white">{server.id}</TableCell>
                        <TableCell className="text-white">{server.name}</TableCell>
                        <TableCell className="text-slate-400 font-mono text-xs">{server.url}</TableCell>
                        <TableCell className="text-slate-400">{server.location}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">Aktif</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" onClick={() => deleteServer(server.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
