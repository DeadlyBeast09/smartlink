

import {
  createShortUrl as createShortUrlService,
  getUrlAndTrackClick,
  getUserUrls,
  getUrlByIdAndOwner,
  updateUrl,
  deleteUrl as deleteUrlService
} from "../services/urlService.js";
import {config} from "../config/index.js";
import {UAParser} from "ua-parser-js";


/**
 * Controllers in this project follow one rule: they translate between
 * HTTP and the service layer, and nothing else. No business logic,
 * no direct Mongoose calls. If you find yourself writing an `if` that
 * checks business rules (not request shape) inside a controller, it
 * belongs in services/ instead.
 *
 * Every controller is wrapped to forward errors to next(), so a single
 * centralized error handler (middlewares/errorHandler.js) renders the
 * response. This avoids try/catch boilerplate repeated in every handler.
 */

// Renders the homepage with the "create short URL" form.
const renderHome = (req, res) => {
  res.render("home", { shortUrl: null, error: null });
};

// Handles the form submission (and will later double as a JSON API endpoint).
const createShortUrl = async (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    const url = await createShortUrlService(originalUrl,req.user.id);

    const shortUrl = `${config.baseUrl}/${url.shortId}`;

    // Browser form submission -> render page with result.
    // (Phase 2+ will add a JSON branch via content negotiation.)
    return res.render("home", { shortUrl, error: null });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).render("home", {
        shortUrl: null,
        error: err.message,
      });
    }
    return next(err);
  }
};

// Redirects /:shortId to the original URL and tracks the click.
const redirectToOriginalUrl = async (req, res, next) => {
  try {
    const { shortId } = req.params;

    const parser = new UAParser(
      req.headers["user-agent"]
    );

    const analyticsData = {
      browser:
        parser.getBrowser().name ||
        "Unknown",

      device:
        parser.getDevice().type ||
        "Desktop",

      referrer:
        req.get("referer") ||
        "Direct",
    };

    const url =
      await getUrlAndTrackClick(
        shortId,
        analyticsData
      );

    return res.redirect(
      url.originalUrl
    );
  } catch (err) {
    return next(err);
  }
};

/**
 * Dashboard = authenticated user's URL inventory.
 *
 * This controller intentionally contains no filtering logic.
 * The service layer decides which URLs belong to the user.
 */
const renderDashboard = async (
  req,
  res,
  next
) => {
  try {
    const urls = await getUserUrls( req.user.id);
    return res.render("dashboard",{urls,});
  } catch (err) {
    return next(err);
  }
};

const renderEditUrl = async (
  req,
  res,
  next
) => {
  try {
    const url =
      await getUrlByIdAndOwner(
        req.params.shortId,
        req.user.id
      );

    return res.render(
      "edit-url",
      {
        url,
      }
    );
  } catch (err) {
    return next(err);
  }
};

const editUrl = async (
  req,
  res,
  next
) => {
  try {
    await updateUrl(
      req.params.shortId,
      req.user.id,
      req.body.originalUrl
    );

    return res.redirect(
      "/dashboard"
    );
  } catch (err) {
    return next(err);
  }
};

/**
 * Deletes a URL owned by the currently authenticated user.
 */
const deleteUrl = async (
  req,
  res,
  next
) => {
  try {
    await deleteUrlService(
      req.params.shortId,
      req.user.id
    );

    return res.redirect(
      "/dashboard"
    );
  } catch (err) {
    return next(err);
  }
};

export {
  renderHome,
  createShortUrl,
  redirectToOriginalUrl,
  renderDashboard,
  renderEditUrl,
  editUrl,
  deleteUrl
};
