'use client';

import React, { useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { FirstBusinessSuccessModal } from './FirstBusinessSuccessModal';
import { FirstBillSuccessModal } from './FirstBillSuccessModal';
import { useBeginnerGuide } from './BeginnerGuideContext';

export function DashboardActivationModals({
  businessId,
  initialFirstBusiness = false,
  initialFirstBillSuccess = false,
}: {
  businessId: string;
  initialFirstBusiness?: boolean;
  initialFirstBillSuccess?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { startTour } = useBeginnerGuide();

  const [dismissedFirstBusiness, setDismissedFirstBusiness] = useState<boolean>(false);
  const [dismissedFirstBill, setDismissedFirstBill] = useState<boolean>(false);

  const showFirstBusiness =
    !dismissedFirstBusiness &&
    (initialFirstBusiness || searchParams.get('firstBusiness') === '1');

  const showFirstBillSuccess =
    !dismissedFirstBill &&
    (initialFirstBillSuccess || searchParams.get('firstBillSuccess') === '1');

  const cleanupParams = (removeKey: string) => {
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(removeKey);
      const newQuery = params.toString();
      const targetUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
      window.history.replaceState(null, '', targetUrl);
    } catch {}
  };

  const handleDismissFirstBusiness = () => {
    setDismissedFirstBusiness(true);
    cleanupParams('firstBusiness');
  };

  const handleContinueFirstBill = () => {
    setDismissedFirstBill(true);
    cleanupParams('firstBillSuccess');
    // Seamlessly start the product tour on dashboard
    startTour(0);
  };

  return (
    <>
      <FirstBusinessSuccessModal
        isOpen={showFirstBusiness}
        businessId={businessId}
        onDismiss={handleDismissFirstBusiness}
      />

      <FirstBillSuccessModal
        isOpen={showFirstBillSuccess}
        onContinue={handleContinueFirstBill}
      />
    </>
  );
}
