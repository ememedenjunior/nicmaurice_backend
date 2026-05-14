const bcrypt = require("bcrypt");
const crypto = require("crypto");
const NursingApplicant = require("../model/Applicant");
const Student = require("../model/Student");
const {
  generateVerificationToken,
  generateStudentId,
  generateTempPassword,
} = require("../config/generateToken");
const { sendEmail } = require("../config/email");

// Apply to academy
exports.apply = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      email,
      phoneNumber,
      address,
      highestQualification,
      institutionAttended,
      graduationYear,
      programAppliedFor,
      intakeYear,
    } = req.body;

    console.log(req.body)

    if (!firstName || !lastName || !email || !programAppliedFor) {
      return res.status(400).json({
        message: "Missing required application fields",
      });
    }

    const existingApplicant = await NursingApplicant.findOne({ email });
    if (existingApplicant) {
      return res.status(409).json({
        message: "Application with this email already exists",
      });
    }

    // Generate verification token
    const { token, hashedToken } = generateVerificationToken();

    const applicant = await NursingApplicant.create({
      firstName,
      lastName,
      gender,
      dateOfBirth,
      email,
      phoneNumber,
      address,
      highestQualification,
      institutionAttended,
      graduationYear,
      programAppliedFor,
      intakeYear,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24hrs
    });

    // Verification link
    const verifyUrl = `https://nicmauricebackend-production.up.railway.app/applicant/verify-email/${token}`;

    // Send email
    await sendEmail({
      to: applicant.email,
      subject: "Verify Your Application – Nic Maurice Nursing Academy",
      html: `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <p>Dear ${applicant.firstName},</p>

    <p>
      Thank you for applying to 
      <strong>PeakiQ Academy – Nursing Program</strong>.
    </p>

    <p>
      To complete your application, please verify your email address by clicking the button below:
    </p>

    <p style="margin: 24px 0;">
      <a 
        href="${verifyUrl}" 
        style="
          background-color: #007BFF;
          color: #ffffff;
          padding: 12px 20px;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
        "
      >
        Verify Email
      </a>
    </p>

    <p style="font-size: 14px; color: #666;">
      ⚠️ This verification link will expire in 24 hours for security reasons.
    </p>

    <p>
      If you did not initiate this application, you can safely ignore this email.
    </p>

    <p>Best regards,<br/>PeakiQ Academy Admissions Team</p>
  </div>
`,
    });

    res.status(201).json({
      message: "Application submitted. Please check your email to verify.",
      applicantId: applicant._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error during application",
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const applicant = await NursingApplicant.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!applicant) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    applicant.emailVerified = true;
    applicant.emailVerificationToken = undefined;
    applicant.emailVerificationExpires = undefined;
    applicant.applicationStatus = "Under Review";

    await applicant.save();

    res.status(200).send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Email Verified</title>
    <meta charset="UTF-8">
  </head>
  <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
    <h1 style="color: #4caf50;">✓ Email Verified Successfully</h1>
    <p style="font-size: 18px; color: #333;">Your application is now under review.</p>
    <p style="color: #666; margin-top: 30px;">You may close this window.</p>
  </body>
  </html>
`);
  } catch (error) {
    res.status(500).json({
      message: "Email verification failed",
    });
  }
};

exports.GetApplicant = async (req, res) => {
  if (req.user.role != "AdmissionOfficer") {
    return res.status(401).json({
      message: "You are unauthorised to admit this applicant",
    });
  }

  try {
    const applicants = await NursingApplicant.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applicants.length,
      data: applicants,
    });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching applicants",
    });
  }
};

// Admission officer confirms applicant
exports.confirmAdmission = async (req, res) => {
  if (req.user.role != "AdmissionOfficer") {
    return res.status(401).json({
      message: "You are unauthorised to admit this applicant",
    });
  }

  try {
    const { applicantId } = req.params;

    // 1️⃣ Find applicant
    const applicant = await NursingApplicant.findById(applicantId);
    if (!applicant) {
      return res.status(404).json({
        message: "Applicant not found",
      });
    }

    // 2️⃣ Ensure email is verified
    if (!applicant.emailVerified) {
      return res.status(400).json({
        message: "Applicant email not verified",
      });
    }

    // 3️⃣ Prevent double admission and make sure we are accepting an application under review
    if (applicant.applicationStatus === "Accepted") {
      return res.status(409).json({
        message: "Applicant already admitted",
      });
    }

    if (applicant.applicationStatus !== "Under Review") {
      return res.status(409).json({
        message: "Review applicant before admission",
      });
    }

    // 4️⃣ Generate student credentials
    const studentId = generateStudentId(applicant.intakeYear);
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 5️⃣ Create student account
    const student = await Student.create({
      studentId,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      email: applicant.email,
      password: hashedPassword,
      program: applicant.programAppliedFor,
      mustChangePassword: true,
    });

    // 6️⃣ Update applicant status
    applicant.applicationStatus = "Accepted";
    applicant.studentId = studentId;
    applicant.admittedAt = new Date();
    await applicant.save();

    // 7️⃣ Send acceptance email
    await sendEmail({
      to: applicant.email,
      subject: "Admission Accepted – PeakiQ Academy",
      html: `
        <p>Dear ${applicant.firstName},</p>
        <p>Congratulations 🎉</p>
        <p>You have been <strong>offered admission</strong> into the
        <strong>${applicant.programAppliedFor}</strong> program at PeakiQ Academy.</p>

        <p><strong>Your Student Details:</strong></p>
        <ul>
          <li><strong>Student ID:</strong> ${studentId}</li>
          <li><strong>Temporary Password:</strong> ${tempPassword}</li>
        </ul>

        <p>Please log in and change your password immediately.</p>

        <a href="nicmauricecolleges/academy/login">
          Login to Student Portal
        </a>

        <p>Welcome to PeakiQ Academy.</p>
      `,
    });

    res.status(200).json({
      message: "Admission confirmed and student account created",
    });
  } catch (error) {
    console.error("Admission confirmation error:", error);
    res.status(500).json({
      message: "Server error while confirming admission",
    });
  }
};

// Admission officer confirms applicant
exports.reviewAdmission = async (req, res) => {
  if (req.user.role != "AdmissionOfficer") {
    return res.status(401).json({
      message: "You are unauthorised to admit this applicant",
    });
  }

  try {
    const { applicantId } = req.params;

    // 1️⃣ Find applicant
    const applicant = await NursingApplicant.findById(applicantId);
    if (!applicant) {
      return res.status(404).json({
        message: "Applicant not found",
      });
    }

    // 2️⃣ Ensure email is verified
    if (!applicant.emailVerified) {
      return res.status(400).json({
        message: "Applicant email not verified",
      });
    }

    if (applicant.applicationStatus !== "Pending") {
      return res.status(409).json({
        message: "Only pending admission can be reviewed",
      });
    }

    // 6️⃣ Update applicant status
    applicant.applicationStatus = "Under Review";
    await applicant.save();

    // 7️⃣ Send acceptance email
    await sendEmail({
      to: applicant.email,
      subject: "Admission Under Review – PeakiQ Academy",
      html: `
        <p>Dear ${applicant.firstName},</p>
        <p>Your application has been accepted and under review 🎉</p>
        <p>Stay tuned for more update on your application.</p>
      `,
    });

    res.status(200).json({
      message: "Admission under review",
    });
  } catch (error) {
    console.error("Admission under review error:", error);
    res.status(500).json({
      message: "Server error while confirming admission",
    });
  }
};

// Admin rejects applicant
exports.rejectApplicant = async (req, res) => {
  if (req.user.role != "AdmissionOfficer") {
    return res.status(401).json({
      message: "You are unauthorised to admit this applicant",
    });
  }

  try {
    const { applicantId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const applicant = await NursingApplicant.findById(applicantId);
    if (!applicant) {
      return res.status(404).json({
        message: "Applicant not found",
      });
    }

    // Prevent double review
    if (applicant.applicationStatus === "Rejected") {
      return res.status(409).json({
        message: "Applicant already rejected",
      });
    }

    if (applicant.applicationStatus !== "Under Review") {
      return res.status(409).json({
        message: "Review applicant before rejection",
      });
    }

    // Update applicant record
    applicant.applicationStatus = "Rejected";
    applicant.rejectionReason = reason;
    applicant.reviewedBy = req.user.id; // Admin ID
    applicant.reviewedAt = new Date();

    await applicant.save();

    // Send rejection email
    await sendEmail({
      to: applicant.email,
      subject: "Application Outcome – PeakiQ Academy",
      html: `
        <p>Dear ${applicant.firstName},</p>

        <p>Thank you for your interest in the
        <strong>${applicant.programAppliedFor}</strong> program at PeakiQ Academy.</p>

        <p>After careful review, we regret to inform you that your application
        was <strong>not successful</strong> at this time.</p>

        <p><strong>Reason:</strong> ${reason}</p>

        <p>You may reapply in a future intake if eligible.</p>

        <p>We wish you success in your academic journey.</p>

        <p>— Admissions Office<br/>PeakiQ Academy</p>
      `,
    });

    res.status(200).json({
      message: "Applicant rejected and notified successfully",
    });
  } catch (error) {
    console.error("Rejection error:", error);
    res.status(500).json({
      message: "Server error while rejecting applicant",
    });
  }
};
