
import mongoose from "mongoose";
/**
 * Establishes a single shared connection to MongoDB.
 *
 * Why this lives in config/ and not app.js:
 * - Keeps connection logic (and future options like connection pooling,
 *   retry strategy) in one place, separate from server bootstrapping.
 * - Makes it trivial to swap the connection target in tests (see tests/).
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8+ no longer needs useNewUrlParser/useUnifiedTopology,
      // they are defaults now — kept out intentionally to avoid deprecation noise.
    });

    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error(`[DB] Connection error after initial connect: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] MongoDB disconnected");
    });
  } catch (err) {
    console.error(`[DB] Initial connection failed: ${err.message}`);
    // Fail fast: a backend with no DB should not pretend to be healthy.
    process.exit(1);
  }
};

export default connectDB;
