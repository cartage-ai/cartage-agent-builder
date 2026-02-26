import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import TrpcProvider from "./_trpc/provider"
import "./globals.css"
import { AuthProvider } from "@propelauth/nextjs/client"

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: "Cartage Agent Builder",
    description: "Spin up cloud dev environments with Cartage Agent and live previews",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <AuthProvider authUrl={process.env.NEXT_PUBLIC_AUTH_URL ?? ""}>
                    <TrpcProvider>{children}</TrpcProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
