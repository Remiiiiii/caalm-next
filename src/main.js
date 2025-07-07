import sdk from 'node-appwrite';

// This Appwrite function will be executed every time your function is triggered
const handler = async ({ req, res, log, error }) => {
  // You can use the Appwrite SDK to interact with other services
  // For this example, we're using the Mails service
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const mail = new sdk.Mails(client);

  try {
    await mail.create(
      process.env.APPWRITE_SYSTEM_EMAIL_ADDRESS, // from
      req.body.to, // to
      req.body.subject,
      req.body.text,
      req.body.html
    );
    // Log messages and errors to the Appwrite Console
    // These logs won't be seen by your end users
    log('Email sent successfully');
  } catch (err) {
    error('Could not send email: ' + err.message);
  }

  // The req object contains the request data
  if (req.path === '/ping') {
    // Use res object to respond with text(), json(), or binary()
    // Don't forget to return a response!
    return res.text('Pong');
  }

  return res.json({
    motto: 'Build like a team of hundreds_',
    learn: 'https://appwrite.io/docs',
    connect: 'https://appwrite.io/discord',
    getInspired: 'https://builtwith.appwrite.io',
  });
};

export default handler;
