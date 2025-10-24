const nodemailer = require("nodemailer");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Send login details to team members
const sendLoginDetails = async (teamName, members, username, password) => {
  const transporter = createTransporter();

  // Extract roll numbers from members string
  const membersList = members.split(",").map((m) => m.trim());
  const rollNumbers = membersList
    .map((member) => {
      const rollMatch = member.match(/\(([^)]+)\)$/);
      return rollMatch ? rollMatch[1] : null;
    })
    .filter((roll) => roll !== null);

  // User agents to rotate
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101"
  ];

  // Send email to each member with delay
  const results = [];
  for (let i = 0; i < rollNumbers.length; i++) {
    const rollNumber = rollNumbers[i];
    const email = `${rollNumber}@aec.edu.in`;
    const userAgent = userAgents[i % userAgents.length];

    const mailOptions = {
      sender: process.env.EMAIL_USER, // explicit sender
      from: `"Aditya University Review System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Aditya University Review System — Access Credentials for ${teamName}`,
      replyTo: process.env.EMAIL_USER,
      headers: {
        "List-Unsubscribe": `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`,
        "X-Entity-Ref-ID": `review-${teamName}-${Date.now()}`,
        "X-Mailer": `ReviewSystem-${Math.random().toString(36).substr(2, 9)}`,
        "User-Agent": userAgent,
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
        "Message-ID": `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@rs.ofzen.in>`,
        Importance: "Normal",
      },
      text: `Aditya University Review System - Access Details\n\nDear Student,\n\nYour team ${teamName} has been registered.\n\nUsername: ${username}\nPassword: ${password}\n\nPlease login at: http://rs.ofzen.in\n\nRegards,\nReview Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Aditya University Review System Login Details</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">Aditya University <br/>AIML Review System</h1>
              <p style="color: #7f8c8d; margin: 5px 0 0 0;">Login Credentials</p>
            </div>
            
            <p style="color: #34495e; line-height: 1.6;">Dear Student,</p>
            <p style="color: #34495e; line-height: 1.6;">Your team <strong style="color: #2c3e50;">${teamName}</strong> has been successfully registered in the Review System.</p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: blue; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <h2 style="margin: 0 0 20px 0; font-size: 20px;">Your Login Details</h2>
              <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 5px; margin: 10px 0;">
                <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
              </div>
              <a href="http://rs.ofzen.in" style="display: inline-block; background: #27ae60; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold;">Access Dashboard</a>
            </div>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin-top: 0;">Important Guidelines:</h3>
              <ul style="color: #34495e; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Keep your credentials secure and confidential</li>
                <li>Use these credentials to access your student dashboard</li>
                <li>Contact your department head for any login issues</li>
                <li>Check your dashboard regularly for updates</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="color: #7f8c8d; margin: 0;">Best regards,</p>
              <p style="color: #2c3e50; font-weight: bold; margin: 5px 0 0 0;">Review System Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      envelope: {
        from: process.env.EMAIL_USER,
        to: email,
      },
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${email}`);
      results.push({ email, success: true });
    } catch (error) {
      console.error(`❌ Failed to send email to ${email}:`, error.message);
      results.push({ email, success: false, error: error.message });
    }

    // Add 1 second delay between emails to prevent rate limiting
    if (i < rollNumbers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
};

module.exports = {
  sendLoginDetails,
};
