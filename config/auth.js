const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// middleware/authorizeRegistrar.js
// module.exports = (req, res, next) => {
//   if (!req.user || !req.user.roles.includes("registrar")) {
//     return res.status(403).json({ message: "Registrar access required" });
//   }
//   next();
// };
