"use client"

import { useEffect } from "react"
import Cookies from "js-cookie"
import { SESSION_COOKIE_KEY } from "@/constants/app.constants"
import { useLogoutFunction, useRedirectFunctions } from "@propelauth/nextjs/client"

export default function LogoutPage() {
    const logout = useLogoutFunction()
    const { redirectToLoginPage } = useRedirectFunctions()

    useEffect(() => {
        const performLogout = async () => {
            Cookies.remove(SESSION_COOKIE_KEY)
            await logout()
            redirectToLoginPage()
        }

        performLogout()
    }, [logout, redirectToLoginPage])

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p className="text-sm text-gray-600">Logging out...</p>
        </div>
    )
}
