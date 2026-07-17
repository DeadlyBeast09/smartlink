import {
  getAnalyticsSummary,
} from "../services/analyticsService.js";

import {
  getUrlByIdAndOwner,
} from "../services/urlService.js";

const renderAnalytics =
  async (
    req,
    res,
    next
  ) => {
    try {
      const shortId =
        req.params.shortId;

      await getUrlByIdAndOwner(
        shortId,
        req.user.id
      );

      const analytics =
        await getAnalyticsSummary(
          shortId
        );

      return res.render(
        "analytics",
        {
          shortId,
          analytics,
        }
      );
    } catch (err) {
      return next(err);
    }
  };

export {
  renderAnalytics,
};