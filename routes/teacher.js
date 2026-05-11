const express = require("express");
const router = express.Router();
const {
  loginTeacher,
  createStaff,
  getAllStaff,
  updateStaff
} = require("../controllers/teacher");
const authMiddleware = require("../config/auth");

router.post("/login", loginTeacher);
router.post("/", authMiddleware, createStaff);
router.get("/", authMiddleware, getAllStaff);
router.put("/:id", authMiddleware, updateStaff);

module.exports = router;
