const applicationService = require("../services/applicationService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function createApplication(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid opportunity ID is required",
      });
    }

    const application = await applicationService.createApplication(
      id,
      req.user.id,
    );

    return res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (error) {
    console.error("Create application failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to submit application",
    });
  }
}

async function getMyApplications(req, res) {
  try {
    const applications = await applicationService.getMyApplications(
      req.user.id,
    );

    return res.status(200).json({ applications });
  } catch (error) {
    console.error("Get my applications failed:", error);

    return res.status(500).json({
      error: "Unable to fetch applications",
    });
  }
}

async function getOpportunityApplications(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid opportunity ID is required",
      });
    }

    const result = await applicationService.getOpportunityApplications(
      id,
      req.user.id,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get opportunity applications failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to fetch applicants",
    });
  }
}

async function acceptApplication(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid application ID is required",
      });
    }

    const application = await applicationService.acceptApplication(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Application accepted",
      application,
    });
  } catch (error) {
    console.error("Accept application failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to accept application",
    });
  }
}

async function rejectApplication(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid application ID is required",
      });
    }

    const application = await applicationService.rejectApplication(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Application rejected",
      application,
    });
  } catch (error) {
    console.error("Reject application failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to reject application",
    });
  }
}

async function withdrawApplication(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid application ID is required",
      });
    }

    const application = await applicationService.withdrawApplication(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Application withdrawn",
      application,
    });
  } catch (error) {
    console.error("Withdraw application failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to withdraw application",
    });
  }
}

module.exports = {
  createApplication,
  getMyApplications,
  getOpportunityApplications,
  acceptApplication,
  rejectApplication,
  withdrawApplication,
};
