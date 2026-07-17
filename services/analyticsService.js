import Analytics from "../models/Analytics.js";

const recordClick = async (
  url,
  analyticsData
) => {
  await Analytics.create({
    urlId: url._id,
    shortId: url.shortId,
    browser:
      analyticsData.browser,
    device:
      analyticsData.device,
    referrer:
      analyticsData.referrer,
  });
};

const getAnalyticsSummary =
  async (shortId) => {
    const totalClicks =
      await Analytics.countDocuments({
        shortId,
      });

    const dailyClicks =
      await Analytics.aggregate([
        {
          $match: { shortId },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  "%Y-%m-%d",
                date:
                  "$clickedAt",
              },
            },
            clicks: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    const weeklyClicks =
  await Analytics.aggregate([
    {
      $match: { shortId },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%U",
            date: "$clickedAt",
          },
        },
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

    const monthlyClicks =
      await Analytics.aggregate([
        {
          $match: { shortId },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  "%Y-%m",
                date:
                  "$clickedAt",
              },
            },
            clicks: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]);

    const browsers =
      await Analytics.aggregate([
        {
          $match: { shortId },
        },
        {
          $group: {
            _id: "$browser",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]);

    const devices =
      await Analytics.aggregate([
        {
          $match: { shortId },
        },
        {
          $group: {
            _id: "$device",
            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const referrers =
      await Analytics.aggregate([
        {
          $match: { shortId },
        },
        {
          $group: {
            _id: "$referrer",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ]);

    return {
      totalClicks,
      dailyClicks,
      weeklyClicks,
      monthlyClicks,
      browsers,
      devices,
      referrers,
    };
  };

export {
  recordClick,
  getAnalyticsSummary,
};