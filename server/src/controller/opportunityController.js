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

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid organization ID is required",
      });
    }

    const opportunities = await opportunityService.getOrganizationOpportunities(
      id,
      userId,
    );

    return res.status(200).json({ opportunities });
  } catch (error) {
    console.error("Get opportunities error:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Failed to fetch organization opportunities",
    });
  }
}

async function getPublicOpportunities(req, res) {
  try {
    const { search, city, upcoming, sort, page, limit } = req.query;

    for (const [name, value] of Object.entries({ search, city })) {
      if (value !== undefined && typeof value !== "string") {
        return res.status(400).json({
          error: `Invalid ${name} filter`,
        });
      }
    }

    if (search !== undefined && search.trim().length > 100) {
      return res.status(400).json({
        error: "Search query must be 100 characters or fewer",
      });
    }

    if (city !== undefined && city.trim().length > 100) {
      return res.status(400).json({
        error: "City filter must be 100 characters or fewer",
      });
    }

    if (upcoming !== undefined && !["true", "false"].includes(upcoming)) {
      return res.status(400).json({
        error: "Upcoming filter must be true or false",
      });
    }

    if (sort !== undefined && !["start_asc", "start_desc"].includes(sort)) {
      return res.status(400).json({
        error: "Sort must be start_asc or start_desc",
      });
    }

    const parsedPage = page === undefined ? 1 : Number(page);
    const parsedLimit = limit === undefined ? 9 : Number(limit);

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        error: "Page must be a positive integer",
      });
    }

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 50
    ) {
      return res.status(400).json({
        error: "Limit must be an integer between 1 and 50",
      });
    }

    const result = await opportunityService.getPublicOpportunities({
      search: search?.trim() || null,
      city: city?.trim() || null,
      upcoming: upcoming === "true",
      sort: sort || "start_asc",
      page: parsedPage,
      limit: parsedLimit,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get public opportunities failed:", error);

    return res.status(500).json({
      error: "Unable to fetch opportunities",
    });
  }
}

async function getOpportunity(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid opportunity ID is required",
      });
    }

    const opportunity = await opportunityService.getOpportunityById(
      id,
      req.user?.id ?? null,
    );

    if (!opportunity) {
      return res.status(404).json({
        error: "Opportunity not found",
      });
    }

    return res.status(200).json({ opportunity });
  } catch (error) {
    console.error("Get opportunity failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to fetch opportunity",
    });
  }
}

async function patchOpportunity(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid opportunity ID is required",
      });
    }

    const forbiddenFields = [
      "id",
      "organization_id",
      "created_by",
      "status",
    ].filter((field) => req.body[field] !== undefined);

    if (forbiddenFields.length > 0) {
      return res.status(400).json({
        error: "ID, organization, creator, and status cannot be updated",
      });
    }

    const DATE_TIME_REGEX =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

    const updates = {};

    if (req.body.title !== undefined) {
      if (
        typeof req.body.title !== "string" ||
        !req.body.title.trim() ||
        req.body.title.trim().length > 200
      ) {
        return res.status(400).json({
          error: "Title must contain 1 to 200 characters",
        });
      }

      updates.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      if (
        typeof req.body.description !== "string" ||
        !req.body.description.trim()
      ) {
        return res.status(400).json({
          error: "Description cannot be empty",
        });
      }

      updates.description = req.body.description.trim();
    }

    if (req.body.city !== undefined) {
      if (
        typeof req.body.city !== "string" ||
        !req.body.city.trim() ||
        req.body.city.trim().length > 100
      ) {
        return res.status(400).json({
          error: "City must contain 1 to 100 characters",
        });
      }

      updates.city = req.body.city.trim();
    }

    for (const field of ["startsAt", "endsAt"]) {
      if (req.body[field] !== undefined) {
        if (
          typeof req.body[field] !== "string" ||
          !DATE_TIME_REGEX.test(req.body[field]) ||
          !Number.isFinite(new Date(req.body[field]).getTime())
        ) {
          return res.status(400).json({
            error: "Valid start and end date-times with timezones are required",
          });
        }

        updates[field] = req.body[field];
      }
    }

    if (req.body.capacity !== undefined) {
      if (
        req.body.capacity !== null &&
        (!Number.isInteger(req.body.capacity) || req.body.capacity <= 0)
      ) {
        return res.status(400).json({
          error: "Capacity must be a positive integer or null",
        });
      }

      updates.capacity = req.body.capacity;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "No valid fields were supplied for update",
      });
    }

    const opportunity = await opportunityService.updateOpportunity(
      id,
      req.user.id,
      updates,
    );

    return res.status(200).json({
      message: "Opportunity updated successfully",
      opportunity,
    });
  } catch (error) {
    console.error("Update opportunity failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : "Unable to update opportunity",
    });
  }
}

async function publishOpportunity(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid opportunity ID is required",
      });
    }

    const opportunity = await opportunityService.publishOpportunity(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Opportunity published successfully",
      opportunity,
    });
  } catch (error) {
    console.error("Publish opportunity failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to publish opportunity",
    });
  }
}

async function cancelOpportunity(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid opportunity ID is required",
      });
    }

    const opportunity = await opportunityService.cancelOpportunity(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Opportunity cancelled successfully",
      opportunity,
    });
  } catch (error) {
    console.error("Cancel opportunity failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to cancel opportunity",
    });
  }
}

async function completeOpportunity(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid opportunity ID is required",
      });
    }

    const opportunity = await opportunityService.completeOpportunity(
      id,
      req.user.id,
    );

    return res.status(200).json({
      message: "Opportunity completed successfully",
      opportunity,
    });
  } catch (error) {
    console.error("Complete opportunity failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to complete opportunity",
    });
  }
}

async function deleteOpportunity(req, res) {
  try {
    const { id } = req.params;

    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        error: "Valid opportunity ID is required",
      });
    }

    await opportunityService.deleteOpportunity(id, req.user.id);

    return res.status(204).send();
  } catch (error) {
    console.error("Delete opportunity failed:", error);

    return res.status(error.statusCode || 500).json({
      error: error.statusCode
        ? error.message
        : "Unable to delete opportunity",
    });
  }
}

module.exports = {
  createOpportunity,
  getPublicOpportunities,
  getOrganizationOpportunities,
  getOpportunity,
  patchOpportunity,
  publishOpportunity,
  cancelOpportunity,
  completeOpportunity,
  deleteOpportunity,
};
