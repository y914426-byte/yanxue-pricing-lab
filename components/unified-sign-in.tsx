'use client';

import { GoogleSignIn } from '@/components/google-sign-in';
import { QQSignIn } from '@/components/qq-sign-in';

interface UnifiedSignInProps {
  clientId?: string | null;
  onSuccess: () => void;
  direction?: 'row' | 'col';
}

export function UnifiedSignIn({ clientId, onSuccess, direction = 'row' }: UnifiedSignInProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${direction === 'col' ? 'flex-col items-stretch' : ''}`}>
      {clientId ? (
        <GoogleSignIn clientId={clientId} onSuccess={onSuccess} />
      ) : null}
      <QQSignIn onSuccess={onSuccess} />
    </div>
  );
}
