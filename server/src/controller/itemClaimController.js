const itemClaimService = require("../services/itemClaimService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalidId(res, label) {
  return res.status(400).json({
    error: `Valid ${label} ID is required`,
  });
}

async function createClaim(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "item");
    }

    const claim = await itemClaimService.createClaim(
      id,
      req.user.id,
      req.body ?? {},
    );

    return res.status(201).json({
      message: "Claim submitted successfully",
      claim,
    });
  } catch (error) {
    console.error("Create claim failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to submit claim",
    });
  }
}

async function getReceivedClaims(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "item");
    }

    const data = await itemClaimService.getReceivedClaims(id, req.user.id);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Get received claims failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to fetch claims",
    });
  }
}

async function getMyClaims(req, res) {
  try {
    const claims = await itemClaimService.getMyClaims(req.user.id);

    return res.status(200).json({ claims });
  } catch (error) {
    console.error("Get my claims failed:", error);

    return res.status(500).json({
      error: "Unable to fetch your claims",
    });
  }
}

async function rejectClaim(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "claim");
    }

    const claim = await itemClaimService.rejectClaim(id, req.user.id);

    return res.status(200).json({
      message: "Claim rejected",
      claim,
    });
  } catch (error) {
    console.error("Reject claim failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to reject claim",
    });
  }
}

async function withdrawClaim(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "claim");
    }

    const claim = await itemClaimService.withdrawClaim(id, req.user.id);

    return res.status(200).json({
      message: "Claim withdrawn",
      claim,
    });
  } catch (error) {
    console.error("Withdraw claim failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to withdraw claim",
    });
  }
}

async function acceptClaim(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "claim");
    }

    const claim = await itemClaimService.acceptClaim(id, req.user.id);

    return res.status(200).json({
      message: "Claim accepted and item reserved",
      claim,
    });
  } catch (error) {
    console.error("Accept claim failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to accept claim",
    });
  }
}

async function cancelReservation(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "claim");
    }

    const claim = await itemClaimService.cancelReservation(id, req.user.id);

    return res.status(200).json({
      message: "Reservation cancelled and item made available",
      claim,
    });
  } catch (error) {
    console.error("Cancel reservation failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to cancel reservation",
    });
  }
}

async function updateHandover(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "claim");
    }

    const claim = await itemClaimService.updateHandover(
      id,
      req.user.id,
      req.body ?? {},
    );

    return res.status(200).json({
      message: "Handover details updated",
      claim,
    });
  } catch (error) {
    console.error("Update handover failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to update handover details",
    });
  }
}

async function getClaim(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "claim");
    }

    const claim = await itemClaimService.getClaimById(id, req.user.id);

    return res.status(200).json({ claim });
  } catch (error) {
    console.error("Get claim failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to fetch claim",
    });
  }
}

async function confirmHandover(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return invalidId(res, "claim");
    }

    const claim = await itemClaimService.confirmHandover(id, req.user.id);

    return res.status(200).json({
      message:
        claim.status === "completed"
          ? "Donation completed"
          : "Handover confirmed. Waiting for the other party.",
      claim,
    });
  } catch (error) {
    console.error("Confirm handover failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to confirm handover",
    });
  }
}

module.exports = {
  createClaim,
  getReceivedClaims,
  getMyClaims,
  rejectClaim,
  withdrawClaim,
  acceptClaim,
  cancelReservation,
  updateHandover,
  getClaim,
  confirmHandover,
};
