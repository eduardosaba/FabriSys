import React from 'react';

export default function BrandSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="hidden sm:block">
        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}
