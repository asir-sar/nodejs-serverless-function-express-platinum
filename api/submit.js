const nodemailer = require("nodemailer");
const querystring = require("querystring");

// Configure transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper: parse both JSON and URL-encoded form
const parseBody = async (req) => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        if (req.headers["content-type"]?.includes("application/json")) {
          resolve(JSON.parse(body));
        } else if (req.headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
          resolve(querystring.parse(body));
        } else {
          resolve({});
        }
      } catch (err) {
        reject(err);
      }
    });
  });
};

module.exports = async (req, res) => {
  // Set CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*"); // allow all domains
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).send("OK");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  let data;
  try {
    data = await parseBody(req);
  } catch (err) {
    console.error("Invalid body:", err);
    return res.status(400).send("Invalid request body");
  }

  // Honeypot check
  if (data._honeypot) {
    console.log("Bot detected, ignoring request.");
    return res.status(200).send("Success (bot)");
  }

  const phone = data.phone || data["appointment-phone"];

  // Validate required fields
  if (!data.name || !data.email || (data.form_type === "appointment" && !phone)) {
    return res.status(400).send("Missing required fields");
  }

  // Build email content
  let emailBody = `New submission (${data.form_type || "unknown form"}):\n\n`;
  for (const key in data) {
    if (key === "_honeypot") continue;
    emailBody += `${key.replace(/_/g, " ")}: ${data[key]}\n`;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "asir.jan.2017@gmail.com",
    subject: `New ${data.form_type || "form"} submission from ${data.name}`,
    text: emailBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).send("Email sent successfully!");
  } catch (err) {
    console.error("Error sending email:", err);
    return res.status(500).send("Failed to send email");
  }
};
