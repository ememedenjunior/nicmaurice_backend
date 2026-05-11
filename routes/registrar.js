const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  addCourse,
  updateCourse,
  deleteCourse
} = require("../controllers/registrar");
const { fetchCourses, enrollStudent, getStudentEnrolledCourses } = require("../controllers/courses");
const authMiddleware = require("../config/auth");

router.get("/", authMiddleware, getDashboardStats);
router.post("/course", authMiddleware, addCourse);
router.put("/course/:id", authMiddleware, updateCourse);
router.delete("/course/:id", authMiddleware, deleteCourse);
router.get("/courses", authMiddleware, fetchCourses)
router.post("/course/enroll", authMiddleware, enrollStudent)
router.get("/student/:id", authMiddleware, getStudentEnrolledCourses)

module.exports = router;
