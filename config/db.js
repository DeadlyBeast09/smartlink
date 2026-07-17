import mongoose from "mongoose";
import { config } from "./index.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);

    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error(`[DB] Connection error after initial connect: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] MongoDB disconnected");
    });
  } catch (err) {
    console.error(`[DB] Initial connection failed: ${err.message}`);
    process.exit(1);
  }
};

export default connectDB;