"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Cookies from "js-cookie"
import { api } from "@/utils/api"
import { SESSION_COOKIE_KEY } from "@/constants/app.constants"

const PUBLIC_PATHS = ["/login", "/logout"]

interface AuthGuardProps {
    children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    const { mutateAsync: validateToken } = api.auth.validate.useMutation()

    useEffect(() => {
        if (PUBLIC_PATHS.includes(pathname)) {
            setIsChecking(false)
            setIsAuthenticated(true)
            return
        }

        const checkAuth = async () => {
            const token = Cookies.get(SESSION_COOKIE_KEY)
            if (!token) {
                setIsChecking(false)
                router.push("/login")
                return
            }

            try {
                await validateToken()
                setIsAuthenticated(true)
            } catch {
                Cookies.remove(SESSION_COOKIE_KEY)
                router.push("/login")
            } finally {
                setIsChecking(false)
            }
        }

        checkAuth()
    }, [pathname, router, validateToken])

    if (isChecking || !isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-sm text-gray-600">Authenticating...</p>
            </div>
        )
    }

    return <>{children}</>
}
