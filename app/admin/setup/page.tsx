"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2 } from "lucide-react"

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const createAdmin = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/create-first-admin", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(data.error || "Admin oluşturulamadı")
      }
    } catch (err) {
      setError("Bağlantı hatası: " + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4">
        <Card className="w-full max-w-md bg-black/50 border-purple-500/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-white">Admin Oluşturuldu!</CardTitle>
            <CardDescription className="text-gray-300">Artık giriş yapabilirsiniz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Kullanıcı Adı:</span> massacresd
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">Şifre:</span> Massacresd2025@
              </p>
            </div>
            <Button
              onClick={() => (window.location.href = "/admin/login")}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Giriş Sayfasına Git
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4">
      <Card className="w-full max-w-md bg-black/50 border-purple-500/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">IQ MASSTV Admin Kurulum</CardTitle>
          <CardDescription className="text-gray-300">İlk admin kullanıcısını oluşturun</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-300">Bu işlem ilk admin kullanıcısını oluşturacak:</p>
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-white">Kullanıcı Adı:</span> massacresd
            </p>
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-white">Şifre:</span> Massacresd2025@
            </p>
          </div>

          <Button
            onClick={createAdmin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              "Admin Kullanıcısı Oluştur"
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Admin oluşturduktan sonra bu sayfayı ve API endpoint'ini silin
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
