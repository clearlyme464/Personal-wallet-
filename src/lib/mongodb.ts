import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (clientPromise) return clientPromise;

  // Reuse the client across hot reloads / lambda invocations.
  const globalWithMongo = globalThis as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = new MongoClient(uri).connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

export const COLLECTIONS = {
  wallets: "wallets",
  transactions: "transactions",
} as const;
