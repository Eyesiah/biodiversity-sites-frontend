import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!uri) {
  console.warn('\n\n** MONGODB_URI not found in .env.local. Geocoding cache will be disabled. **\n\n');
  clientPromise = null;
} else {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
    global._mongoClientPromise.catch(err => {
      console.error('** MongoDB connection error: **', err);
    });
  }
  clientPromise = global._mongoClientPromise;
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;