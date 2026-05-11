const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: String,
      required: true,
    },

    course: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["enrolled", "dropped"],
      default: "enrolled",
    },

    // 👇 added fields for fast frontend access (denormalized)
    code: String,
    name: String,
    lecturer: String,
    task: Number,
    live: Boolean,
    grade: {
      type: String,
      default: "In Progress",
    },
    progress: {
      type: Number,
      default: 0, // percentage
    },
  },
  { timestamps: true },
);

// 🔒 Prevent duplicate registration (VERY IMPORTANT)
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
