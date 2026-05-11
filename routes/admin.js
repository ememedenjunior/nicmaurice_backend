const express = require("express");
const router = express.Router();
const {createAdmin, loginAdmin} = require("../controllers/admin")
const authMiddleware = require("../config/auth")

router.post("/create", authMiddleware, createAdmin)
router.post("/login", loginAdmin)


module.exports = router;
