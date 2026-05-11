const crypto = require("crypto");
const Admin = require("../model/Admin");

exports.generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return { token, hashedToken };
};

exports.generateStudentId = (intakeYear) => {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PKQ-${intakeYear}-${random}`;
};

exports.generateTempPassword = () => {
  return Math.random().toString(36).slice(-8);
};

exports.generateAdminId = async () => {
  let adminId;
  let exists = true;

  while (exists) {
    adminId = "ADM" + Math.floor(100000 + Math.random() * 900000); // ADM + 6 digits
    exists = await Admin.findOne({ adminId });
  }

  return adminId;
};

// Helper: Generate 8 digit password
exports.generatePassword = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};
