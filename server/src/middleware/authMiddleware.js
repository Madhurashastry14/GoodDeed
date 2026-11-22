const jwt = require("jsonwebtoken");
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Access token required",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired access token",
    });
  }
}

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Public visitors can continue without a token
  if (!authHeader) {
    return next();
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Invalid authorization header",
    });
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired access token",
    });
  }
}
module.exports = { authMiddleware, optionalAuthMiddleware };
