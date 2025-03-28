import { z } from 'zod'

export const roomNameValidation = z.string().min(3, "Room Name must be at least 3 characters").max(20, "Room Name must be at most 20 characters")
export const roomIdValidation = z.string().min(3, "Room Id must be at least 3 characters").max(20, "Room Name Id be at most 20 characters")