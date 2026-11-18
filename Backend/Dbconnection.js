const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Global cache across Serverless invocations in Vercel
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    const connectionString = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lifestyle_ai';

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
        };

        cached.promise = mongoose.connect(connectionString, opts).then((mongooseInstance) => {
            console.log('Successfully connected to MongoDB Atlas');
            return mongooseInstance;
        }).catch((error) => {
            console.error('MongoDB connection error:', error.message);
            cached.promise = null;
            return null;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
    }

    return cached.conn;
};

module.exports = connectDB;
