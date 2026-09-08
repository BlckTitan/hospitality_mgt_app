import { ReactNode } from 'react';

export const fieldRowClassName =
  'w-full h-fit flex flex-col lg:flex-row justify-start items-start gap-2 mb-2 lg:mb-4';

const FIELD_WIDTHS: Record<string, string> = {
  'w-2/12': 'field-w-2',
  'w-4/12': 'field-w-4',
  'w-1/3': 'field-w-third',
  'w-1/2': 'field-w-half',
  'w-2/5': 'field-w-2-5',
  'w-3/5': 'field-w-3-5',
  'w-full': 'w-full max-w-full min-w-0',
};

export function fieldWidthClass(width?: string) {
  if (!width) return 'w-full max-w-full min-w-0';
  return FIELD_WIDTHS[width] ?? FIELD_WIDTHS[`w-${width}`] ?? FIELD_WIDTHS['w-full'];
}

export function Field({
  id,
  label,
  widthClass,
  children,
}: {
  id?: string;
  label: ReactNode;
  widthClass?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col items-start justify-start min-w-0 ${widthClass ?? 'w-full max-w-full'}`}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
