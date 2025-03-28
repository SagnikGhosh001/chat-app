import { z } from 'zod'

export const usernameValidation = z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters").regex(/^[a-zA-Z0-9_]{3,20}$/, "Username must be alphanumeric and contain at least 3 characters")
export const passwordValidation = z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,20}$/, "Password must contain at least one uppercase letter, one lowercase letter, and one number")