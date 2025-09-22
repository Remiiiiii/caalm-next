const sdk = require('node-appwrite');

module.exports = async ({ req, res, log, error }) => {
  // Your function code here
  log('Request body: ' + (req.body || '{}'));

  // Initialize the Appwrite client
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new sdk.Databases(client);
  const messaging = new sdk.Messaging(client);

  try {
    // Parse the request body
    log('Request body type: ' + typeof req.body);
    log('Request body: ' + JSON.stringify(req.body));

    let requestData;
    if (typeof req.body === 'string') {
      requestData = JSON.parse(req.body || '{}');
    } else if (typeof req.body === 'object' && req.body !== null) {
      requestData = req.body;
    } else {
      requestData = {};
    }

    const {
      email,
      name,
      role,
      department,
      orgId,
      invitedBy,
      expiresInDays = 7,
    } = requestData;

    // Validate required fields
    if (!email || !name || !role || !department || !orgId || !invitedBy) {
      const errorResponse = {
        success: false,
        error:
          'Missing required fields: email, name, role, department, orgId, invitedBy',
      };
      log('Error response: ' + JSON.stringify(errorResponse));
      return res.json(errorResponse, 400);
    }

    // Validate role
    const allowedRoles = ['executive', 'admin', 'manager'];
    const normalizedRole = role.toLowerCase();
    if (!allowedRoles.includes(normalizedRole)) {
      const errorResponse = {
        success: false,
        error: `Invalid role: ${role}. Must be one of ${allowedRoles.join(
          ', '
        )}`,
      };
      log('Error response: ' + JSON.stringify(errorResponse));
      return res.json(errorResponse, 400);
    }

    // Generate invitation token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Create invitation document in database
    const invitation = await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.INVITATIONS_COLLECTION_ID,
      sdk.ID.unique(),
      {
        email,
        orgId,
        role: normalizedRole,
        department,
        name,
        token,
        expiresAt,
        status: 'pending',
        revoked: false,
        invitedBy,
        createdAt: new Date().toISOString(),
      }
    );

    // Compose invite link
    const baseUrl = process.env.APP_URL || 'https://www.caalmsolutions.com';
    const inviteLink = `${baseUrl}/invite/accept?token=${token}`;

    // Create email content
    const emailSubject = "You're invited to join CAALM Solutions";
    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invitation to CAALM Solutions</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to CAALM Solutions!</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>You have been invited by <strong>${invitedBy}</strong> to join CAALM Solutions as a <strong>${role}</strong> in the <strong>${department}</strong> department.</p>
              <p>CAALM Solutions is a comprehensive contract management platform that helps organizations streamline their contract lifecycle management processes.</p>
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Accept Invitation</a>
              </div>
              <p><strong>What's next?</strong></p>
              <ul>
                <li>Click the "Accept Invitation" button above</li>
                <li>Complete your account setup</li>
                <li>Start managing contracts efficiently</li>
              </ul>
              <p><strong>Note:</strong> This invitation will expire in ${expiresInDays} days.</p>
              <hr>
              <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
              <p><small><a href="${inviteLink}">${inviteLink}</a></small></p>
            </div>
            <div class="footer">
              <p>© 2024 CAALM Solutions. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Appwrite Messaging
    try {
      const emailResponse = await messaging.createEmail(
        sdk.ID.unique(),
        emailSubject,
        emailContent,
        [], // topics - empty array
        [email], // targets - direct email
        [], // cc
        [], // bcc
        [], // attachments
        false, // draft
        true // html
      );

      log(
        `Email sent successfully to ${email}. Email ID: ${emailResponse.$id}`
      );
    } catch (emailError) {
      error(`Failed to send email: ${emailError.message}`);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

    // Return success response
    const successResponse = {
      success: true,
      data: {
        invitationId: invitation.$id,
        email,
        token,
        expiresAt,
        message: 'Invitation sent successfully',
      },
    };

    log('Success response: ' + JSON.stringify(successResponse));
    return res.json(successResponse);
  } catch (err) {
    error(`Function error: ${err.message}`);
    const errorResponse = {
      success: false,
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    };

    log('Error response: ' + JSON.stringify(errorResponse));
    return res.json(errorResponse, 500);
  }
};
