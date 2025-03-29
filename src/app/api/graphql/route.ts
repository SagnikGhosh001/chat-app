// app/api/graphql/route.ts
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { schema } from '@/graphql/schema'; // Adjust path if needed
import { prisma } from '@/lib/prisma';
import * as dotenv from "dotenv";
import * as jwt from "jsonwebtoken";
import { NextRequest } from 'next/server';
import { client } from '@/lib/redis';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET
if(!JWT_SECRET){
    throw new Error("JWT_SECRET is not defined")
}
const apolloServer = new ApolloServer({
    schema,
});

// Create the handler outside of the request handlers
const handler = startServerAndCreateNextHandler(apolloServer, {
    context: async (req:NextRequest) => {
        // Extract the token from the Authorization header
        const authHeader = req.headers.get('authorization') || '';;        
        let user = null;

        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7); 
            console.log(token,'token');
            try {
                // Verify the token and decode it                
                user = jwt.verify(token, JWT_SECRET);                
            } catch (error:any) {
                console.error('JWT verification failed:', error.message);
            }
        }else{
            console.log('No token provided');
        }
        
        return {
            prisma, 
            user,
            client
        };
    },
});

// Export handlers for POST and GET
export const POST = handler;
export const GET = handler;