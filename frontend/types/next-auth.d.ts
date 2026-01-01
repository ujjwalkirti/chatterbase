import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      username: string
      accessToken: string
      dob: string
      gender: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    username?: string
    token?: string
    dob?: string
    gender?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    username?: string
    accessToken?: string
    dob?: string
    gender?: string
  }
}
