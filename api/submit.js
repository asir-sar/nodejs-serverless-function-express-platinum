const nodemailer = require("nodemailer");

// Configure transporter using environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  let data;
  try {
    data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    console.error("Invalid JSON body:", err);
    return res.status(400).send("Invalid JSON.");
  }

  // Honeypot check
  if (data._honeypot) {
    console.log("Bot detected. Ignoring request.");
    return res.status(200).send("Success (bot)");
  }

  const formType = data.form_type || "unknown";

  // Map form_type to required fields and email subject
  const formConfig = {
    contactpage: {
      required: ["name", "email", "subject", "message"],
      subject: `New Contact Form Message from ${data.name}`,
    },
    footer: {
      required: ["name", "email", "message"],
      subject: `New Footer Form Message from ${data.name}`,
    },
    appointment: {
      required: ["name", "appointment-phone", "appointment-date", "appointment-time", "appointment-message"],
      subject: `New Appointment Request from ${data.name}`,
    },
    mainquote: {
      required: ["name", "email", "phone", "message"],
      subject: `New Quote Request from ${data.name}`,
    },
  };

  const config = formConfig[formType];
  if (!config) {
    return res.status(400).send("Unknown form type.");
  }

  // Validate required fields
  for (const field of config.required) {
    if (!data[field]) {
      return res.status(400).send(`Missing required field: ${field}`);
    }
  }

  // Normalize phone number
  const phone = data.phone || data["appointment-phone"] || "";

  // Build email body
  let emailBody = `New submission from form: ${formType}\n\n`;
  for (const key in data) {
    if (key === "_honeypot") continue;
    emailBody += `${key.replace(/_/g, " ")}: ${data[key]}\n`;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "asir.jan.2017@gmail.com", // Change if needed per form
    subject: config.subject,
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
