import React from 'react';

export default function DashboardHeader() {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-700 text-foreground" style={{ letterSpacing: '-0.01em' }}>
          Good morning, Seth
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cestos Operations — here&apos;s your operational picture for today.
        </p>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-sm font-600 text-foreground">Sep 9, 2026</p>
        <p className="text-xs text-muted-foreground">Tuesday • Week 37</p>
      </div>
    </div>
  );
}