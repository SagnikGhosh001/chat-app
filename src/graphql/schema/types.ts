import {gql} from "graphql-tag";


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
    
    type Query{
        users: [User!]!
        rooms: [Room!]!
        messages(roomId: ID!): [Message!]!
    }
    
    type UserResponse {
        success: Boolean!
        message: String
        user: User
    }
    type RoomResponse {
        success: Boolean!
        message: String
        room: Room
    }
    type MessageResponse {
        success: Boolean!
        message: String
        msg: Message
    }
    
    type Mutation{
        createUser(username:String!, password:String!):UserResponse!
        createRoom(name:String!, roomId:String!):RoomResponse!
        createMessage(content:String!,userId:ID!,roomId:ID!):MessageResponse!
    }
`