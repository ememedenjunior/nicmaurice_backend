const express = require("express");
const router = express.Router();
const { apply, verifyEmail, GetApplicant, confirmAdmission, rejectApplicant, reviewAdmission } = require("../controllers/applicant");
const authMiddleware = require("../config/auth")

router.post("/apply", apply);
router.get("/verify-email/:token", verifyEmail);
router.get("/", authMiddleware, GetApplicant)
router.get(
  "/confirm-admission/:applicantId",
  authMiddleware,
  confirmAdmission,
);
router.get(
  "/review-admission/:applicantId",
  authMiddleware,
  reviewAdmission,
);
router.put("/reject-admission/:applicantId", authMiddleware, rejectApplicant);

module.exports = router;
