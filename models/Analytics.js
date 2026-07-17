import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Url",
      required: true,
      index: true,
    },

    shortId: {
      type: String,
      required: true,
      index: true,
    },

    browser: {
      type: String,
      default: "Unknown",
    },

    device: {
      type: String,
      default: "Desktop",
    },

    referrer: {
      type: String,
      default: "Direct",
    },

    clickedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Analytics",
  analyticsSchema
);