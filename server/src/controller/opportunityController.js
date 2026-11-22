const opportunityService = require("../services/opportunityService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function createOpportunity(req, res) {
  try {
    const {
      organizationId,
      title,
      description,
      city,
      startsAt,
      endsAt,
      capacity,
    } = req.body;

    if (
      typeof organizationId !== "string" ||
      !UUID_REGEX.test(organizationId)
    ) {
      return res.status(400).json({
        error: "Valid organization ID is required",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200
    ) {
      return res.status(400).json({
        error: "Title must contain 1 to 200 characters",
      });
    }

    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({
        error: "Description is required",
      });
    }

    if (typeof city !== "string" || !city.trim() || city.trim().length > 100) {
      return res.status(400).json({
        error: "City must contain 1 to 100 characters",
      });
    }

    // Require ISO 8601 date-time with a timezone.
    const DATE_TIME_REGEX =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

    if (
      typeof startsAt !== "string" ||
      typeof endsAt !== "string" ||
      !DATE_TIME_REGEX.test(startsAt) ||
      !DATE_TIME_REGEX.test(endsAt)
    ) {
      return res.status(400).json({
        error: "Valid start and end date-times with timezones are required",
      });
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      return res.status(400).json({
        error: "End time must be later than start time",
      });
    }

    if (start <= new Date()) {
      return res.status(400).json({
        error: "Start time must be in the future",
      });
    }

    if (
      capacity !== undefined &&
      capacity !== null &&
      (!Number.isInteger(capacity) || capacity <= 0)
    ) {
      return res.status(400).json({
        error: "Capacity must be a positive integer or null",
      });
    }

    const opportunity = await opportunityService.createOpportunity({
      organizationId,
      title: title.trim(),
      description: description.trim(),
      city: city.trim(),
      startsAt: start,
      endsAt: end,
      capacity: capacity ?? null,
      userId: req.user.id,
    });

    return res.status(201).json({
      message: "Opportunity created successfully",
      opportunity,
    });
  } catch (error) {
    console.error("Create opportunity failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to create opportunity",
    });
  }
}

async function getOrganizationOpportunities(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id ?? null;

    const opportunities = await opportunityService.getOrganizationOpportunities(
      id,
      userId,
    );

    return res.status(200).json({ opportunities });
  } catch (error) {
    console.error("Get opportunities error:", error);

    return res.status(500).json({
      error: "Failed to fetch organization opportunities",
    });
  }
}

module.exports = {
  createOpportunity,
  getOrganizationOpportunities,
};
