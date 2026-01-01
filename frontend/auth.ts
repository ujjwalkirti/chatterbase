import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        dob: { label: "Date of Birth", type: "text" },
        gender: { label: "Gender", type: "text" },
        deviceDetails: { label: "Device Details", type: "text" },
      },
      async authorize(credentials) {
        try {
          const deviceDetails = credentials.deviceDetails
            ? JSON.parse(credentials.deviceDetails as string)
            : {}

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                username: credentials.username,
                dob: credentials.dob,
                gender: credentials.gender,
                deviceDetails,
              }),
            }
          )

          const data = await response.json()

          if (data.success && data.data) {
            // Return user object with token
            return {
              id: data.data.user?.id || credentials.username,
              name: credentials.username as string,
              username: credentials.username as string,
              token: data.data.token,
              dob: credentials.dob as string,
              gender: credentials.gender as string,
            }
          }

          return null
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign in, add user data to token
      if (user) {
        token.username = user.username
        token.accessToken = user.token
        token.dob = user.dob
        token.gender = user.gender
      }
      return token
    },
    async session({ session, token }) {
      // Add token data to session
      if (token) {
        session.user.username = token.username as string
        session.user.accessToken = token.accessToken as string
        session.user.dob = token.dob as string
        session.user.gender = token.gender as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
})
