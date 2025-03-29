import { prisma } from "@/lib/prisma"
import { passwordValidation, usernameValidation } from "@/schemas/userSchema"
import * as bcrypt from "bcryptjs"
import { string, z } from "zod"
import * as jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { PubSub, withFilter } from 'graphql-subscriptions';
import { client } from "@/lib/redis";


const JWT_SECRET = process.env.JWT_SECRET as string
if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");
interface Context {
    prisma: typeof prisma
    user: { userId: string } | null
    redis: typeof client
}

const pubsub = new PubSub();
export const resolvers = {
    Query: {
        users: async (_parent: any, _args: any, context: Context) => {
            console.log(context.user?.userId);

            if (!context.user) {
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
        rooms: async (_parent: any, _args: any, context: Context) => {
            if (!context.user) {
                return {
                    success: false,
                    message: "Unauthorized",
                    rooms: []
                }
            }
            const rooms = await prisma.room.findMany()
            return {
                success: true,
                message: "Rooms fetched successfully",
                rooms
            }
        },
        messages: async (_: any, { roomId }: { roomId: string }, context: Context) => {
            if (!context.user) {
                return {
                    success: false,
                    message: "Unauthorized",
                    messages: []
                }
            }
            const messages = await prisma.message.findMany({ where: { roomId } })
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
        createRoom: async (_: any, { name, roomId }: { name: string; roomId: string }, context: Context) => {
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
                await prisma.userRoom.create({ data: { userId: context.user.userId, roomId: room.id } })
                await context.redis.publish('ROOM_CREATED', JSON.stringify(room))
                await pubsub.publish('ROOM_CREATED', { roomCreated: room });
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

        createMessage: async (_: any, { content, roomId }: { content: string,roomId: string }, context: Context) => {
            try {
                if (!context.user || !context.user.userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        user: null
                    }
                }
                const checkUser = await prisma.user.findUnique({ where: { id: context.user.userId } })
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
                const userId= context.user.userId
                const msg = await prisma.message.create({ data: { content, userId, roomId } })

                // Publish to Redis
                await context.redis.publish(`room:${roomId}`, JSON.stringify(msg));

                // Publish to in-memory pub/sub for subscriptions
                pubsub.publish(`MESSAGE_ADDED_${roomId}`, { messageAdded: msg });

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
        joinRoom: async (_: any, { roomId }: { roomId: string }, context: Context) => {
            try {
                if (!context.user || !context.user.userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        user: null
                    }
                }
                const userId = context.user.userId
                const checkUser = await prisma.userRoom.findFirst({ where: { userId, roomId } })
                if (checkUser) {
                    return {
                        success: false,
                        message: "User already joined this room",
                        room: null
                    }
                }
                const room = await prisma.userRoom.create({ data: { userId, roomId } })
                await context.redis.publish(`USER_JOINED:${roomId}`, JSON.stringify(room))
                await pubsub.publish(`USER_JOINED_${roomId}`, { userJoined: room });
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
        leaveRoom: async (_: any, {  roomId }: { roomId: string }, context: Context) => {
            try {
                if (!context.user || !context.user.userId) {
                    return {
                        success: false,
                        message: "Unauthorized",
                        user: null
                    }
                }
                const userId = context.user.userId
                const checkUser = await prisma.userRoom.findFirst({ where: { userId, roomId } })
                if (!checkUser) {
                    return {
                        success: false,
                        message: "User not found in this room",
                        room: null
                    }
                }
                const room = await prisma.userRoom.delete({ where: { id: checkUser.id } })
                await context.redis.publish(`LEFT:${roomId}`, JSON.stringify(room))
                await pubsub.publish(`USER_LEFT_${roomId}`, { userJoined: room });
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
    },

    
}