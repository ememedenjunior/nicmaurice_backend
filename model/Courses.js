const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    level: {
      type: Number,
      required: true,
    },

    semester: {
      type: String,
      required: true,
      enum: ["First", "Second"],
    },

    capacity: {
      type: Number,
      required: true,
      default: 100,
    },

    units: {
      type: Number,
      required: true,
    },

    enrolledCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);


// Optional: Prevent over-enrollment at DB level (extra safety)
courseSchema.methods.isFull = function () {
  return this.enrolledCount >= this.capacity;
};

module.exports = mongoose.model("Course", courseSchema);