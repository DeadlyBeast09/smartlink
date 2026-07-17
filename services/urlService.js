import Url from "../models/Url.js";
import {generateShortId} from "../utils/generateShortId.js";
import {isValidUrl} from "../utils/isValidUrl.js";
import {AppError} from "../utils/AppError.js";
import mongoose from "mongoose";
import {
  recordClick,
} from "./analyticsService.js";

/**
 * Why a service layer exists at all (instead of putting this logic
 * directly in the controller):
 *
 * - Controllers should only know about HTTP: req, res, status codes.
 * - Services know about business rules: "a short URL must be unique,"
 *   "retry on collision," "a click increments a counter." None of that
 *   is HTTP-specific, so it shouldn't live next to req/res.
 * - This makes the logic testable without spinning up Express at all
 *   (see tests/url.service.test.js) and reusable from other entry points
 *   later — e.g. a future internal CLI script or a bulk-import job could
 *   call createShortUrl() directly without going through HTTP.
 */

const MAX_COLLISION_RETRIES = 5;

/**
 * Creates a new short URL document.
 * Retries shortId generation on the rare chance of a collision with
 * the unique index, instead of trusting probability blindly.
 */
const createShortUrl = async (originalUrl,userId) => {
  if (!originalUrl || typeof originalUrl !== "string") {
    throw new AppError("originalUrl is required", 400);
  }

  if (!isValidUrl(originalUrl)) {
    throw new AppError("originalUrl must be a valid http/https URL", 400);
  }

  let attempt = 0;
  let lastError;

  while (attempt < MAX_COLLISION_RETRIES) {
    const shortId = generateShortId();
    try {
      const url = await Url.create({ originalUrl, shortId, createdBy:userId, });
      return url;
    } catch (err) {
      // Mongo duplicate key error code is 11000.
      // Only retry on a genuine collision — anything else should surface.
      if (err.code === 11000) {
        attempt += 1;
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw new AppError(
    "Could not generate a unique short URL, please try again",
    500
  );
  // In practice this branch is reached only if you're extremely unlucky
  // or shortId length is too small for your write volume — see
  // docs/05-url-shortening-deep-dive.md for the collision-probability math.
};



/**
 * Looks up a URL by its shortId and atomically increments its click count.
 *
 * Why findOneAndUpdate (atomic) instead of find() then save():
 * - find() + save() is a read-modify-write with a race condition: two
 *   simultaneous redirects could both read clicks=5 and both write
 *   clicks=6, losing a click. $inc at the database level is atomic —
 *   MongoDB guarantees the increment itself is safe even under concurrent
 *   writes. This is a very common interview question
 *   ("how would you safely increment a counter under concurrency?").
 */
const getUrlAndTrackClick =
  async (
    shortId,
    analyticsData = {}
  ) => {
    const url =
      await Url.findOneAndUpdate(
        { shortId },
        {
          $inc: {
            clicks: 1,
          },
        },
        {
          new: true,
        }
      );

    if (!url) {
      throw new AppError(
        "Short URL not found",
        404
      );
    }

    await recordClick(
      url,
      analyticsData
    );

    return url;
  };
  
const getUrlByShortId = async (shortId) => {
  const url = await Url.findOne({ shortId });
  if (!url) {
    throw new AppError("Short URL not found", 404);
  }
  return url;
};

/**
 * Returns only URLs owned by the supplied user.
 *
 * Why not Url.find({}) ?
 * Because dashboards are user-specific. Returning all URLs would leak
 * other users' data and violate basic authorization rules.
 */
const getUserUrls = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid user id", 400);
  }

  return Url.find({
    createdBy: userId,
  }).select(
  "originalUrl shortId clicks createdAt"
).sort({
    createdAt: -1,
  });
};

/**
 * Returns a URL only if it belongs to the supplied user.
 *
 * Why?
 * Looking up by _id alone would allow a user to access another
 * user's URL if they somehow obtained the document id.
 */
// id => shortId
const getUrlByIdAndOwner = async (
  shortId,
  userId
) => {
  const url = await Url.findOne({
    shortId,
    createdBy: userId,
  });

  if (!url) {
    throw new AppError(
      "URL not found",
      404
    );
  }

  return url;
};

/**
 * Updates the original URL after verifying ownership.
 */
const updateUrl = async (
  shortId,
  userId,
  originalUrl
) => {
  if (!isValidUrl(originalUrl)) {
    throw new AppError(
      "originalUrl must be a valid http/https URL",
      400
    );
  }

  const url = await Url.findOneAndUpdate(
    {
      shortId,
      createdBy: userId,
    },
    {
      originalUrl,
    },
    {
      new: true,
    }
  );

  if (!url) {
    throw new AppError(
      "URL not found",
      404
    );
  }

  return url;
};

/**
 * Deletes a URL only if it belongs to the supplied user.
 *
 * Why include createdBy in the query?
 * Knowing a shortId should not grant permission to delete a URL.
 * Ownership is enforced at the database query level.
 */
const deleteUrl = async (
  shortId,
  userId
) => {
  const url = await Url.findOneAndDelete({
    shortId,
    createdBy: userId,
  });

  if (!url) {
    throw new AppError(
      "URL not found",
      404
    );
  }

  return url;
};


export {
  createShortUrl,
  getUrlAndTrackClick,
  getUrlByShortId,
  getUserUrls,
  updateUrl,
  getUrlByIdAndOwner,
  deleteUrl
};