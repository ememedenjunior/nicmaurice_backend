const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../model/Admin");
const {
  generateAdminId,
  generatePassword,
} = require("../config/generateToken");
const { sendEmail } = require("../config/email");

exports.createSuperAdmin = async () => {
  try {
    const { SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } =
      process.env;

    if (!SUPERADMIN_NAME || !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
      console.log("Missing SuperAdmin env variables");
      process.exit(1);
    }

    // 🚫 Ensure only one SuperAdmin exists
    const existing = await Admin.findOne({ role: "SuperAdmin" });
    if (existing) {
      console.log("SuperAdmin already exists.");
      return
    }

    const adminId = await generateAdminId();
    const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

    await Admin.create({
      adminId,
      fullName: SUPERADMIN_NAME,
      email: SUPERADMIN_EMAIL,
      password: hashedPassword,
      role: "SuperAdmin",
    });

    console.log("SuperAdmin created successfully");
  } catch (error) {
    console.error("Error creating SuperAdmin:", error);
    process.exit(1);
  }
};

// Create Admin (SuperAdmin only)
exports.createAdmin = async (req, res) => {
  try {
    const { fullName, email, role } = req.body;

    if (req.user.role != "SuperAdmin") {
      return res.status(401).json({
        message: "You are unauthorised",
      });
    }

    if (!fullName || !email || !role) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Prevent duplicates
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({
        message: "Admin already exists",
      });
    }

    const adminId = await generateAdminId();
    const pass = generatePassword();

    // Hash password
    const hashedPassword = await bcrypt.hash(pass, 10);

    await Admin.create({
      adminId,
      fullName,
      email,
      password: hashedPassword,
      role,
    });

    // Send email
    await sendEmail({
      to: email,
      subject: "Admin Account Details – Nic Maurice Nursing Academy",
      html: `
            <p>Dear ${fullName},</p>
            <p>You adminstrative account has been created</p>
            <p><strong>Your Admin Details:</strong></p>
            <ul>
              <li><strong>Admin ID:</strong> ${adminId}</li>
              <li><strong>Admin Password:</strong> ${pass}</li>
            </ul>
          `,
    });

    res.status(201).json({
      message: "Admin account created successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error while creating admin",
    });
  }
};

// Admin Login
exports.loginAdmin = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({ adminId }).select("+password");

    if (!admin) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (admin.status !== "Active") {
      return res.status(403).json({
        message: "Admin account suspended",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
        type: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Admin login successful",
      token,
      admin: {
        id: admin.adminId,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      message: "Server error during login",
    });
  }
};
