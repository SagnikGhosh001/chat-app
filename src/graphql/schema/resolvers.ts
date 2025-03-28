import { prisma } from "@/lib/prisma"
import { passwordValidation, usernameValidation } from "@/schemas/userSchema"
import * as bcrypt from "bcryptjs"
import { z } from "zod"
import * as jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
const JWT_SECRET = process.env.JWT_SECRET as string
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
interface Context {
    prisma: typeof Prisma
    user: { userId: string } | null
}
export const resolvers = {
    Query: {
        users: async (_parent: any, _args: any, context: Context) => {
            console.log(context.user?.userId);

            if(!context.user){
                return {
                    success: false,
                    message: "Unauthorized",
                    users: []
                }
            }
            const users = await prisma.user.findMany()
            return {
                success: true,
                message: "Users fetched successfully",
                users
            }
        },
        rooms: async (_parent: any, _args: any, context: any) => {
            if (!context.user) {
                return {
                    success: false,
                    message: "Unauthorized",
                    rooms: []
                }
            }
            const rooms= await prisma.room.findMany()
            return {
                success: true,
                message: "Rooms fetched successfully",
                rooms
            }
        },
        messages: async (_: any, { roomId }: { roomId: string }, context: any) => {
            if (!context.user) {
                return {
                    success: false,
                    message: "Unauthorized",
                    messages: []
                }
            }
            const messages= await prisma.message.findMany({ where: { roomId } })
            return {
                success: true,
                message: "Messages fetched successfully",
                messages
            }
        }
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
                    throw validationError
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
        createRoom: async (_: any, { name, roomId }: { name: string; roomId: string }, context: any) => {
            try {
                if (!context.user) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        user: null
                    }
                }
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

        createMessage: async (_: any, { content, userId, roomId }: { content: string; userId: string; roomId: string }, context: any) => {
            try {
                if (!context.user) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        user: null
                    }
                }
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
        },
        joinRoom: async (_: any, { userId, roomId }: { userId: string, roomId: string }, context: any) => {
            try {
                if (!context.user) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        user: null
                    }
                }
                const checkUser = await prisma.userRoom.findFirst({ where: { userId, roomId } })
                if (checkUser) {
                    return {
                        success: false,
                        message: "User already joined this room",
                        room: null
                    }
                }
                const room = await prisma.userRoom.create({ data: { userId, roomId } })
                return {
                    success: true,
                    message: "User joined room successfully",
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
        leaveRoom: async (_: any, { userId, roomId }: { userId: string, roomId: string }, context: any) => {
            try {
                if (!context.user) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        user: null
                    }
                }
                const checkUser = await prisma.userRoom.findFirst({ where: { userId, roomId } })
                if (!checkUser) {
                    return {
                        success: false,
                        message: "User not found in this room",
                        room: null
                    }
                }
                const room = await prisma.userRoom.delete({ where: { id: checkUser.id } })
                return {
                    success: true,
                    message: "User left room successfully",
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
        login: async (_: any, { username, password }: { username: string; password: string }) => {
            try {
                const user = await prisma.user.findUnique({ where: { username } })
                if (!user) {
                    return {
                        success: false,
                        message: "User not found",
                        user: null
                    }
                }
                const isPasswordValid = await bcrypt.compare(password, user.password)
                if (!isPasswordValid) {
                    return {
                        success: false,
                        message: "Invalid password",
                        user: null
                    }
                }
                const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
                return {
                    success: true,
                    message: "Login successful",
                    user,
                    token
                }
            } catch (error) {
                return {
                    success: false,
                    message: "Internal server error",
                    user: null
                }
            }
        }
    }
}