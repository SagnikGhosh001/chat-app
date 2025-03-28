// app/api/graphql/route.ts
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { schema } from '@/graphql/schema'; // Adjust path if needed
import { prisma } from '@/lib/prisma';

const apolloServer = new ApolloServer({
    schema,
});

// Create the handler outside of the request handlers
const handler = startServerAndCreateNextHandler(apolloServer, {
    context: async () => ({
        prisma, // Pass Prisma client to resolvers
    }),
});

// Export handlers for POST and GET
export const POST = handler;
export const GET = handler;