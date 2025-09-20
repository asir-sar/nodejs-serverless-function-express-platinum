// This is a simplified serverless function using Node.js
// You would deploy this file to a service like Vercel, Netlify, or AWS Lambda.

const nodemailer = require("nodemailer");

// Set up your email transporter using environment variables for security.
// DO NOT hard-code your credentials here.
const transporter = nodemailer.createTransport({
  service: "gmail", // Or another email service like SendGrid, Mailgun, etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const data = req.body;

  // Honeypot check for spam prevention
  if (data._honeypot) {
    console.log("Spam bot detected. Discarding request.");
    return res.status(200).send("Success (bot)"); // Return success to not tip off the bot
  }

  // Simple validation for required fields
  if (!data.name || !data.email || !data.phone_number) {
    return res.status(400).send("Missing required fields.");
  }

  // Format the email content
  let emailBody = "New moving request received:\n\n";
  for (const key in data) {
    // Skip honeypot field
    if (key === "_honeypot") {
      continue;
    }
    emailBody += `${key.replace(/_/g, " ")}: ${data[key]}\n`;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "customer-service@yourcompany.com", // The recipient email address
    subject: `New Moving Request from ${data.name}`,
    text: emailBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Failed to send email.");
  }
};

