import {Suspense} from 'react';
import VerifyPhoneClient from './VerifyPhoneClient';

export default function VerifyPhonePage() {
  return (
    <Suspense>
      <VerifyPhoneClient />
    </Suspense>
  );
}