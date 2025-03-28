import { z } from 'zod'

export const messageValidation = z.string().max(400, "Message must be at most 400 characters")