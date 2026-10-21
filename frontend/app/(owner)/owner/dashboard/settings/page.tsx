import {SettingsPage} from '@/features/owner/settings/components/SettingsPage';
import {PushNotificationManager} from '@/components/pwa/PushNotificationManager';

export default function SettingsPageRoute() {
  return (
    <>
      <div className="px-4 pt-4">
        <PushNotificationManager />
      </div>
      <SettingsPage />
    </>
  );
}
