const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      unique: true,
      required: true
    },
    firstName: String,
    lastName: String,
    email: {
      type: String,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    program: String,
    mustChangePassword: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
