// services/enrollment.service.js
const Course = require("../model/Courses");
const Enrollment = require("../model/Entollment");

const fetchCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Fetch Courses Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


const getStudentEnrolledCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.params.id,
    }).populate("course");

    return res.status(200).json({
      success: true,
      enrollments,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const enrollStudent = async (req, res) => {

  const {studentId, courseId} = req.body

  const existing = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });
  if (existing) throw new Error("Already enrolled");

  const course = await Course.findById(courseId);

  if (course.enrolledCount >= course.capacity) {
    throw new Error("Course full");
  }

  const enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
    code: course.code,
    name: course.title,
    lecturer: course.lecturer,
    task: 0,
    live: false
  });

  await Course.findByIdAndUpdate(courseId, {
    $inc: { enrolledCount: 1 },
  });

  return enrollment;
};

module.exports = { fetchCourses, enrollStudent, getStudentEnrolledCourses };
