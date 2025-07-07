import { Suspense } from 'react';
import AcceptInviteClient from './AcceptInviteClient';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptInviteClient />
    </Suspense>
  );
}
