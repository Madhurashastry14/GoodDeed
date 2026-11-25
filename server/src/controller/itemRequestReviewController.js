const itemRequestReviewService = require("../services/itemRequestReviewService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidId(res) {
  return res.status(400).json({
    error: "Valid item request ID is required",
  });
}

function failure(res, error, fallback) {
  console.error(fallback, error);

  return res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : fallback,
  });
}

async function getAccess(req, res) {
  try {
    const access = await itemRequestReviewService.getReviewerAccess(
      req.user.id,
    );

    return res.status(200).json(access);
  } catch (error) {
    return failure(res, error, "Unable to check reviewer access");
  }
}

async function getPending(req, res) {
  try {
    const data = await itemRequestReviewService.getPendingQueue(req.query);

    return res.status(200).json(data);
  } catch (error) {
    return failure(res, error, "Unable to fetch the review queue");
  }
}

async function getReviewRequest(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res);
    }

    const detail = await itemRequestReviewService.getReviewDetail(
      id,
      req.user.id,
    );

    return res.status(200).json(detail);
  } catch (error) {
    return failure(res, error, "Unable to fetch the item request");
  }
}

function decide(action) {
  return async function decideHandler(req, res) {
    try {
      const { id } = req.params;

      if (!UUID_REGEX.test(id)) {
        return invalidId(res);
      }

      const result = await itemRequestReviewService.reviewRequest(
        id,
        req.user.id,
        action,
        req.body ?? {},
      );

      const messages = {
        approve: "Item request approved and published",
        reject: "Item request rejected",
        "request-changes": "Changes requested from the requester",
      };

      return res.status(200).json({
        message: messages[action],
        review: result.review,
        request: result.request,
      });
    } catch (error) {
      return failure(res, error, "Unable to record the review decision");
    }
  };
}

module.exports = {
  getAccess,
  getPending,
  getReviewRequest,
  approve: decide("approve"),
  reject: decide("reject"),
  requestChanges: decide("request-changes"),
};
