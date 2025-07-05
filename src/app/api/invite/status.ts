import { NextApiRequest, NextApiResponse } from 'next';
import { getInvitationByToken } from '@/lib/actions/user.actions'; // You may need to create this

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'No token provided' });

  try {
    const invite = await getInvitationByToken(token as string);
    if (!invite) return res.status(404).json({ error: 'Invitation not found' });
    res.status(200).json(invite);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
}
