import { Suspense } from 'react';
import StationList from '@/tab/station-list/StationList';

export default function StationListPage() {
  return (
    <Suspense fallback={null}>
      <StationList />
    </Suspense>
  );
}
