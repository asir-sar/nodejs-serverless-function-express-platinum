# Node.js Hello World
email: my official yahoo
p@ss: کودوتنن نامشآت
Simple Node.js + Vercel example that returns a "Hello World" response.

## How to Use

You can choose from one of the following two methods to use this repository:

### One-Click Deploy

Deploy the example using [Vercel](https://vercel.com?utm_source=github&utm_medium=readme&utm_campaign=vercel-examples):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/vercel/examples/tree/main/solutions/node-hello-world&project-name=node-hello-world&repository-name=node-hello-world)

### Clone and Deploy

```bash
git clone https://github.com/vercel/examples/tree/main/solutions/node-hello-world
```

Install the Vercel CLI:

```bash
npm i -g vercel
```

Then run the app at the root of the repository:

```bash
vercel dev
```
// Serverless function using Node.js (for Vercel, Netlify, AWS Lambda)
const nodemailer = require("nodemailer");

// Configure transporter (use env vars for security)
const transporter = nodemailer.createTransport({
  service: "gmail",
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

  // Parse request body safely
  let data;
  try {
    data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    console.error("Invalid JSON body:", err);
    return res.status(400).send("Invalid JSON.");
  }

  // Honeypot spam check
  if (data._honeypot) {
    console.log("Spam bot detected. Ignoring request.");
    return res.status(200).send("Success (bot)");
  }

  // Normalize phone field (accept phone or phone_number)
  const phone = data.phone_number || data.phone;

  // Validate required fields
  if (!data.name || !data.email || !phone) {
    return res.status(400).send("Missing required fields.");
  }

  // Build email body
  let emailBody = "New moving request received:\n\n";
  for (const key in data) {
    if (key === "_honeypot") continue;
    emailBody += `${key.replace(/_/g, " ")}: ${data[key]}\n`;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "asir.jan.2017@gmail.com", // replace with real recipient
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
