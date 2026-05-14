const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "simplyemem10@gmail.com",
    pass: process.env.EMAIL_PASS || "wsfouyrkrsqljtie"
  }
});

exports.sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `Nick Maurice Nursing Academy`,
    to,
    subject,
    html
  });
};
