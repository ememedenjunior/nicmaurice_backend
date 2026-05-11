const mongoose = require("mongoose");

const nursingApplicantSchema = new mongoose.Schema(
  {
    // Personal Information
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
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },

    // Contact Information
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },

    // Academic Background
    highestQualification: {
      type: String,
      required: true,
    },
    institutionAttended: {
      type: String,
      required: true,
    },
    graduationYear: {
      type: Number,
      required: true,
    },

    // Nursing Program Details
    programAppliedFor: {
      type: String,
      required: true,
    },
    intakeYear: {
      type: Number,
      required: true,
    },

    // Documents
    documents: {
      oLevelResult: String,
      transcript: String,
      birthCertificate: String,
      passportPhotograph: String,
    },

    // Application Status
    applicationStatus: {
      type: String,
      enum: ["Pending", "Under Review", "Accepted", "Rejected"],
      default: "Pending",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    reviewedAt: {
      type: Date,
    },

    // System Fields
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("NursingApplicant", nursingApplicantSchema);
