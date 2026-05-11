const jwt = require("jsonwebtoken");
const Student = require("../model/Student");
const bcrypt = require("bcrypt");

// Student Login
exports.loginStudent = async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // Find student (password is select:false in schema)
    const student = await Student.findOne({ studentId }).select("+password");

    if (!student) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // JWT payload
    const token = jwt.sign(
      {
        id: student._id,
        role: "student",
        studentId: student.studentId
      },
      process.env.JWT_SECRET || "6Y6UYUYUYYUYSGg",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      student: {
        id: student._id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        program: student.program,
      }
    });
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({
      message: "Server error during login"
    });
  }
};
