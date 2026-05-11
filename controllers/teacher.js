const jwt = require("jsonwebtoken");
const Staff = require("../model/Staff");
const bcrypt = require("bcrypt");
const { generatePassword } = require("../config/generateToken");
const { sendEmail } = require("../config/email");

// Student Login
exports.loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find student (password is select:false in schema)
    const staff = await Staff.findOne({ email }).select("+password");

    if (!staff) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // JWT payload
    const token = jwt.sign(
      {
        id: staff._id,
        role: "teacher",
        staffId: staff.staffId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      teacher: {
        id: staff._id,
        staffId: staff.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
      },
    });
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({
      message: "Server error during login",
    });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      position,
      department,
      employeeType,
      specialization,
      degree,
      emergencyContact,
    } = req.body;

    // 1. Validate Teaching staff requirements
    if (employeeType === "Teaching" && (!specialization || !degree)) {
      return res.status(400).json({
        success: false,
        message: "Teaching staff must have specialization and degree",
      });
    }

    // 2. Check existing staff
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: "Staff with this email already exists",
      });
    }

    let plainPassword = null;
    let hashedPassword = null;

    // 3. Only Teaching staff gets login credentials
    if (position === "lecturer") {
      plainPassword = generatePassword();
      hashedPassword = await bcrypt.hash(plainPassword, 10);
    }

    // 4. Create staff payload (single source of truth)
    const staffData = {
      firstName,
      lastName,
      email,
      phoneNumber,
      position,
      department,
      staffType: employeeType,
      specialization,
      degree,
      emergencyContact,
      ...(hashedPassword && { password: hashedPassword }),
    };

    const staff = await Staff.create(staffData);

    // 5. Send email only if Teaching staff
    if (position === "lecturer") {
      await sendEmail({
        to: email,
        subject: "Lecturer Account – Nic Maurice Nursing Academy",
        html: `
          <p>Dear ${firstName},</p>

          <p>Your lecturer account has been created successfully.</p>

          <p><strong>Login Details:</strong></p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Password:</strong> ${plainPassword}</li>
          </ul>

          <p>Please change your password after first login.</p>
        `,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Create Staff Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error creating staff",
    });
  }
};

exports.getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    console.error("Get Staff Error:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching staff",
    });
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    console.log(staffId);
    const updateData = { ...req.body };

    // 1️⃣ Fetch the staff
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    // 2️⃣ If staffType is Teaching, ensure specialization and degree if provided
    if (updateData.staffType === "teaching") {
      if ("specialization" in updateData && !updateData.specialization) {
        return res.status(400).json({
          success: false,
          message: "Teaching staff must have a specialization",
        });
      }

      if ("degree" in updateData && !updateData.degree) {
        return res.status(400).json({
          success: false,
          message: "Teaching staff must have a degree",
        });
      }
    }

    // 4️⃣ Update staff
    const updatedStaff = await Staff.findByIdAndUpdate(staffId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      data: updatedStaff,
    });
  } catch (error) {
    console.error("Update Staff Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating staff",
      error: error.message,
    });
  }
};
