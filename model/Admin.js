const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    adminId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["SuperAdmin", "AdmissionOfficer", "HROfficer", "RegistrarOfficer"],
      default: "SuperAdmin"
    },

    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active"
    },

    // Login tracking
    lastLogin: {
      type: Date
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);

