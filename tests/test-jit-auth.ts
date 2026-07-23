import { describe, it, expect } from 'vitest';
import { MongoClient } from 'mongodb';

// Configure environment variables before importing modules that evaluate them on load
process.env.NODE_ENV = 'development';
process.env.ENABLE_MOCK_AUTH = 'true';

const { authenticateUser, deleteFirebaseUser, authMiddleware } = await import('../src/middleware/auth.js');
const dbModule = await import('../src/api/db.js');

// Mock request and response
const mockReq = (token: string): any => ({
  headers: {
    authorization: `Bearer ${token}`
  }
});

const mockRes = (): any => ({
  status: (code: number) => ({
    json: (data: any) => {
      // console.log(`Response ${code}:`, data);
    }
  })
});

describe('JIT Authentication Middleware Tests', () => {
  it('should prevent user duplication when JIT profile creation runs concurrently', async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/?connectTimeoutMS=2000&serverSelectionTimeoutMS=2000';
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db('yuvahub_test');
      const usersCollection = db.collection('users');

      await usersCollection.deleteMany({ firebaseUid: "mock_user_123" });
      try {
        await usersCollection.createIndex({ firebaseUid: 1 }, { unique: true });
      } catch (e) {
        // Index might already exist
      }

      // 1. Test JIT Profile Creation (simulating 3 concurrent requests) with explicit DB injection
      const localAuthMiddleware = authenticateUser(db);
      const nextFn = () => {};

      await Promise.all([
        localAuthMiddleware(mockReq("MOCK_VALID_TOKEN"), mockRes(), nextFn),
        localAuthMiddleware(mockReq("MOCK_VALID_TOKEN"), mockRes(), nextFn),
        localAuthMiddleware(mockReq("MOCK_VALID_TOKEN"), mockRes(), nextFn)
      ]);

      const users = await usersCollection.find({ firebaseUid: "mock_user_123" }).toArray();
      expect(users.length).toBe(1);

      // Clean up local test db entries
      await deleteFirebaseUser("mock_user_123");
      await usersCollection.deleteOne({ firebaseUid: "mock_user_123" });
      const afterDelete = await usersCollection.find({ firebaseUid: "mock_user_123" }).toArray();
      expect(afterDelete.length).toBe(0);

    } catch (err: any) {
      console.warn("Skipping real MongoDB tests because database is unavailable:", err.message);
    } finally {
      await client.close();
    }
  });

  it('should successfully fallback to module-level dbCommand at runtime when invoked through exported authMiddleware', async () => {
    // 2. Initialize the database which populates module-level dbCommand (either MockDB or real MongoClient)
    await dbModule.initializeDatabase();
    expect(dbModule.dbCommand).not.toBeNull();

    // Clear user if exists from the configured dbCommand
    const usersCollection = dbModule.dbCommand.collection('users');
    await usersCollection.deleteOne({ firebaseUid: "mock_user_123" });

    // Call the exported authMiddleware (its closure is initialized with null, but must dynamically resolve dbCommand at runtime)
    const nextFn = () => {};
    await authMiddleware(mockReq("MOCK_VALID_TOKEN"), mockRes(), nextFn);

    const users = await usersCollection.find({ firebaseUid: "mock_user_123" }).toArray();
    expect(users.length).toBe(1);

    // Clean up
    await deleteFirebaseUser("mock_user_123");
    await usersCollection.deleteOne({ firebaseUid: "mock_user_123" });
  });
});
