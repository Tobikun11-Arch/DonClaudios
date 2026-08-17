'use client';

import Footer from '@/shared/components/layout/Footer';
import {useSettingsQuery} from '@/lib/hooks/useSettings';

export default function ConnectedFooter() {
  const {data: settings} = useSettingsQuery();
  return <Footer footer={settings?.footer} colors={settings?.colors} />;
}
