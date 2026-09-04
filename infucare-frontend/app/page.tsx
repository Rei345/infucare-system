"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Droplets, Eye, EyeOff, Lock, User, Shield, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeProvider } from "@/components/providers/theme-provider"

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  
  // Tambahkan state untuk menangani pesan error dari backend
  const [errorMsg, setErrorMsg] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg("") // Reset error setiap kali tombol ditekan

    try {
      // Panggil endpoint autentikasi Golang
      // Sesuaikan URL ini dengan rute login yang ada di backend kamu
      const response = await fetch("http://localhost:8080/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      })

      const data = await response.json()

      // Jika backend merespons dengan status selain 2xx (misal: 401 Unauthorized)
      if (!response.ok) {
        throw new Error(data.message || data.error || "Gagal masuk. Periksa kredensial Anda.")
      }

      // Jika sukses, simpan Token JWT ke localStorage agar bisa dibaca oleh halaman Dashboard
      localStorage.setItem("infucare_token", data.token)
      
      // Opsional: Simpan data profil pengguna
      if (data.user) {
        localStorage.setItem("infucare_user", JSON.stringify(data.user))
      }

      // Arahkan ke dashboard
      router.push("/dashboard")
      
    } catch (error: any) {
      // Tangkap dan tampilkan pesan error ke UI
      setErrorMsg(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <Card className="glass border-border/50">
            <CardHeader className="space-y-4 text-center">
              {/* Logo */}
              <motion.div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Droplets className="h-10 w-10 text-primary-foreground" />
                <motion.div
                  className="absolute h-20 w-20 rounded-2xl bg-primary/30"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold">InfuCare</CardTitle>
                <CardDescription className="text-base">
                  Sistem Monitoring & Kontrol Infus
                </CardDescription>
              </div>

              {/* Security Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mx-auto flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-sm text-success"
              >
                <Shield className="h-4 w-4" />
                <span>Masukkan Kredensian Anda</span>
              </motion.div>
            </CardHeader>

            <CardContent>
              {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 rounded-lg bg-destructive/15 p-3 text-sm text-destructive text-center font-medium"
                  >
                    {errorMsg}
                  </motion.div>
              )}
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  {/* Username Field */}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="username"
                        placeholder="Masukkan username anda"
                        className="pl-10"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Masukkan password anda"
                        className="pl-10 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      <span>Memverifikasi...</span>
                    </motion.div>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </form>

              {/* Clinic Branding */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 flex flex-col items-center gap-3 border-t border-border pt-6"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm">POSKESDES Lumban Jaean</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">BD</span>
                  </div>
                  <span className="text-sm font-medium">Unit Bidan Desa</span>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            Protected by end-to-end encryption
          </motion.p>
        </motion.div>
      </div>
    </ThemeProvider>
  )
}
