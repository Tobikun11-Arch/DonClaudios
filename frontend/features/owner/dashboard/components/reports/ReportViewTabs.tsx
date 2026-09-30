'use client';

import {FilterPills} from '@/shared/components/FilterPills';
import {REPORT_VIEWS} from '@/lib/types/report';
import type {ReportView} from '@/lib/types/report';

/**
 * Reports live as sub-tabs inside the Dashboard tab (there is no separate
 * Reports nav item), mirroring the pill styling used by the inventory filters.
 * `FilterPills` drops them to a dropdown on phones, where five labels cannot fit.
 */
export function ReportViewTabs({
  value,
  onChange
}: {
  value: ReportView;
  onChange: (view: ReportView) => void;
}) {
  return (
    <FilterPills
      items={REPORT_VIEWS.map(view => ({key: view.key, label: view.label}))}
      value={value}
      onChange={next => onChange(next as ReportView)}
      ariaLabel="Report views"
    />
  );
}
