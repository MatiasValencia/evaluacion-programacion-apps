import { createContext } from 'react'
import type { AppUser } from './api'

export const AuthContext = createContext<AppUser | null>(null)
