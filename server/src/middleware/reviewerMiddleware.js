const reviewerService = require("../services/reviewerService");

/**
 * Must run after authMiddleware. Reviewer rights are read from the database on
 * every request so revocation takes effect immediately and no client-supplied
 * role can escalate access.
 */
async function requireReviewer(req, res, next) {
  try {
    const allowed = await reviewerService.isReviewer(req.user?.id);

    if (!allowed) {
      return res.status(403).json({
        error: "Platform reviewer access required",
      });
    }

    return next();
  } catch (error) {
    console.error("Reviewer authorization failed:", error);

    return res.status(500).json({
      error: "Unable to verify reviewer access",
    });
  }
}

module.exports = { requireReviewer };
