import mongoose from "mongoose";

/**
 * Url Schema
 *
 * Phase 1:
 * - originalUrl
 * - shortId
 * - clicks
 *
 * Phase 3:
 * - createdBy (URL ownership for user dashboard)
 *
 * Fields for later phases (e.g. customAlias, analytics metadata)
 * are intentionally deferred until they have a concrete use case.
 * Avoid premature schema design—every field should exist because
 * the application currently needs it.
 */
const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, "Original URL is required"],
      trim: true,
    },
    shortId: {
      type: String,
      required: true,
      unique: true, // creates a unique index — see docs/03-database-design.md
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
     createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt automatically
  }
);

export default mongoose.model("Url", urlSchema);
