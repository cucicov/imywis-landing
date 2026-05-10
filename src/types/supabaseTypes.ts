
import type { Session } from '@supabase/supabase-js'

export type AuthUIProps = {
    setEmail: (value: string) => void
    setPassword: (value: string) => void
    handleLogin: () => Promise<void>
    handleSignUp: () => Promise<void>
}

export type AppUIProps = {
    session: Session
    handleLogout: () => Promise<void>
}