"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { api } from "@/utils/api"
import { SESSION_COOKIE_KEY } from "@/constants/app.constants"
import { useLogoutFunction, useRedirectFunctions, useUser } from "@propelauth/nextjs/client"

export default function LoginPage() {
    const { loading: isLoadingAuthInfo, isLoggedIn, accessToken } = useUser()
    const logout = useLogoutFunction()
    const { redirectToLoginPage } = useRedirectFunctions()
    const router = useRouter()

    const { mutateAsync: authLogin } = api.auth.authLogin.useMutation()

    useEffect(() => {
        const login = async () => {
            if (isLoadingAuthInfo) return

            if (!isLoggedIn || !accessToken) {
                redirectToLoginPage()
                return
            }

            try {
                const result = await authLogin({ accessToken })
                Cookies.set(SESSION_COOKIE_KEY, result.sessionToken, {
                    expires: 7,
                    secure: true,
                    sameSite: "Strict",
                })
                router.push("/")
            } catch {
                await logout()
                redirectToLoginPage()
            }
        }

        login()
    }, [isLoadingAuthInfo, isLoggedIn, accessToken, authLogin, logout, redirectToLoginPage, router])

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p className="text-sm text-gray-600">Authenticating...</p>
        </div>
    )
}
