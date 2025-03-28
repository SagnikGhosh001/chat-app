import { gql } from "graphql-tag";


export const typeDefs = gql`
    type User{
        id: ID!
        username: String!
        createdAt: String!
        updatedAt: String!
        messages: [Message!]!
        userRooms: [Room!]!
    }
    type Room{
        id: ID!
        name: String!
        roomId: String!
        createdAt: String!
        updatedAt: String!
        messages: [Message!]!
        userRooms: [User!]!
    }
    type Message{
        id: ID!
        content: String!
        createdAt: String!
        updatedAt: String!
        room: Room!
        user: User!
    }
    
    type UserResponse {
        success: Boolean!
        message: String
        user: User
        token: String
        users:[User!]!
    }
    type RoomResponse {
        success: Boolean!
        message: String
        room: Room
        rooms: [Room!]!
    }
    type MessageResponse {
        success: Boolean!
        message: String
        msg: Message
        messages: [Message!]!
    }

    type Query{
        users: UserResponse!
        rooms: RoomResponse!
        messages(roomId: ID!): MessageResponse!
    }
    
   
    
    type Mutation{
        createUser(username:String!, password:String!):UserResponse!
        createRoom(name:String!, roomId:String!):RoomResponse!
        createMessage(content:String!,userId:ID!,roomId:ID!):MessageResponse!
        joinRoom(userId:ID!,roomId:ID!):RoomResponse!
        leaveRoom(userId:ID!,roomId:ID!):RoomResponse!
        login(username:String!,password:String!):UserResponse!
    }
`