import { prisma } from "@/lib/prisma"
import { passwordValidation, usernameValidation } from "@/schemas/userSchema"
import * as bcrypt from "bcryptjs"
import { z } from "zod"

export const resolvers = {
    Query: {
        users: async () => { return await prisma.user.findMany() },
        rooms: async () => { return await prisma.room.findMany() },
        messages: async (_: any, { roomId }: { roomId: string }) => { return await prisma.message.findMany({ where: { roomId } }) }
    },
    Mutation: {
        createUser: async (_: any, { username, password }: { username: string, password: string }) => {
            try {
                try {
                    usernameValidation.parse(username);
                    passwordValidation.parse(password);
                  } catch (validationError) {
                    if (validationError instanceof z.ZodError) {
                      return {
                        success: false,
                        message: validationError.errors[0].message, 
                        user: null,
                      };
                    }
                    throw validationError; 
                  }

                const hashedPassword = await bcrypt.hash(password, 10)
                const checkingUser = await prisma.user.findUnique({ where: { username } })
                if (checkingUser) {
                    return {
                        success: false,
                        message: "User already exists with this username",
                        user: null
                    }
                }
                const user = await prisma.user.create({
                    data: {
                        username,
                        password: hashedPassword
                    }
                })
                return {
                    success: true,
                    message: "User created successfully",
                    user
                }
            } catch (error) {
                return {
                    success: false,
                    message: "Internal server error",
                    user: null
                }
            }
        },
        createRoom: async (_: any, { name, roomId }: { name: string; roomId: string }) => {
            try {
                const checkRoom = await prisma.room.findUnique({ where: { roomId } })
                if (checkRoom) {
                    return {
                        success: false,
                        message: "Room already exists with this roomId",
                        room: null
                    }
                }
                const room = await prisma.room.create({ data: { name, roomId } })
                return {
                    success: true,
                    message: "Room created successfully",
                    room
                }
            } catch (error) {
                return {
                    success: false,
                    message: "Internal server error",
                    room: null
                }
            }
        },

        createMessage: async (_: any, { content, userId, roomId }: { content: string; userId: string; roomId: string }) => {
            try {
                const checkUser = await prisma.user.findUnique({ where: { id: userId } })
                if (!checkUser) {
                    return {
                        success: false,
                        message: "User not found",
                        msg: null
                    }
                }
                const checkRoom = await prisma.room.findUnique({ where: { id: roomId } })
                if (!checkRoom) {
                    return {
                        success: false,
                        message: "Room not found",
                        msg: null
                    }
                }
                const msg = await prisma.message.create({ data: { content, userId, roomId } })
                return {
                    success: true,
                    message: "Message created successfully",
                    msg
                }
            } catch (error) {
                return {
                    success: false,
                    message: "Internal server error",
                    msg: null
                }

            }
        }
    }
}