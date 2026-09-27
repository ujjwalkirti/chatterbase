import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"

class CustomAuthError extends CredentialsSignin {
  code: string
  constructor(message: string) {
    super(message)
    this.code = message
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        flow: { label: "Flow", type: "text" },
        identifier: { label: "Identifier", type: "text" },
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        dob: { label: "Date of Birth", type: "text" },
        gender: { label: "Gender", type: "text" },
        ipAddress: { label: "IP Address", type: "text" },
        deviceDetails: { label: "Device Details", type: "text" },
      },
      async authorize(credentials) {
        try {
          const deviceDetails = credentials?.deviceDetails
            ? (typeof credentials.deviceDetails === "string" ? JSON.parse(credentials.deviceDetails) : credentials.deviceDetails)
            : {}

          const flow = (credentials?.flow as string) || "guest"
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
          let endpoint = `${apiUrl}/api/auth/guest-login`
          let payload: Record<string, any> = {}

          if (flow === "permanent-login") {
            endpoint = `${apiUrl}/api/auth/login-permanent`
            payload = {
              identifier: credentials?.identifier || credentials?.username || credentials?.email,
              password: credentials?.password,
              deviceDetails,
            }
          } else if (flow === "permanent-register") {
            endpoint = `${apiUrl}/api/auth/register-permanent`
            payload = {
              username: credentials?.username,
              email: credentials?.email,
              password: credentials?.password,
              gender: credentials?.gender,
              dob: credentials?.dob,
              ip_address: credentials?.ipAddress,
              deviceDetails,
            }
          } else {
            endpoint = `${apiUrl}/api/auth/guest-login`
            payload = {
              username: credentials?.username,
              dob: credentials?.dob,
              gender: credentials?.gender,
              ip_address: credentials?.ipAddress,
              deviceDetails,
            }
          }

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })

          const data = await response.json()

          if (data.success && data.data) {
            const user = data.data.user
            return {
              id: user?.id ? String(user.id) : (credentials?.username as string) || (credentials?.identifier as string),
              name: user?.username || (credentials?.username as string),
              username: user?.username || (credentials?.username as string),
              email: user?.email || (credentials?.email as string) || undefined,
              token: data.data.token,
              dob: user?.dob || (credentials?.dob as string),
              gender: user?.gender || (credentials?.gender as string),
              userStatus: user?.user_status || (flow.startsWith("permanent") ? "permanent" : "anonymous"),
            }
          }

          throw new CustomAuthError(data.message || "Authentication failed")
        } catch (error) {
          if (error instanceof CredentialsSignin) {
            throw error
          }
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username
        token.accessToken = user.token
        token.dob = user.dob
        token.gender = user.gender
        token.userStatus = user.userStatus
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.username = token.username as string
        session.user.accessToken = token.accessToken as string
        session.user.dob = token.dob as string
        session.user.gender = token.gender as string
        session.user.userStatus = token.userStatus as string
        session.user.email = (token.email as string) || ""
      }
      return session
    },
  },
  pages: {
    signIn: "/guest-login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
})
