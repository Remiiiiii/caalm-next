import NotificationDebug from '@/components/NotificationDebug';
import ContractExpiryTestComponent from '@/components/ContractExpiryTestComponent';

export default function TestNotificationsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Notification Debug & Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NotificationDebug />
        <ContractExpiryTestComponent />
      </div>
    </div>
  );
}
