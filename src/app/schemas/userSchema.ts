import { z } from 'zod'

export const usernameValidation = z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters").regex(/^[a-zA-Z0-9_]{3,20}$/, "Username must be alphanumeric and contain at least 3 characters")
export const emailValidation = z.string().email({ message: "Invalid email" })