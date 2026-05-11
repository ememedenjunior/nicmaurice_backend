const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      trim: true,
    },

    position: {
      type: String,
      enum: ["admissionOfficer", "humanResource", "HOD", "lecturer", "staff"],
      default: "staff",
    },

    employeeType: {
      type: String,
      enum: ["teaching", "non-teaching"],
      default: "non-teaching",
    },

    // ⭐ NEW — Teaching Staff Fields
    specialization: {
      type: String,
      trim: true,
    },

    degree: {
      type: String,
      trim: true,
    },

    hireDate: {
      type: Date,
      default: Date.now,
    },

    department: {
      type: String,
      enum: [
        "Nursing",
        "Medicine",
        "Administration",
        "Facilities",
        "IT",
        "HR",
        "Finance",
        "Student Affairs",
        "Clinical Services",
        "Research",
        "Library",
        "Security",
      ],
    },

    password: {
      type: String,
      required: false,
    },

    // ✅ Emergency Contact
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      relationship: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Staff", staffSchema);
