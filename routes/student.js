const express = require("express");
const router = express.Router();
const { loginStudent } = require("../controllers/student");
const authMiddleware = require("../config/auth");

router.post("/login", loginStudent);

module.exports = router;
