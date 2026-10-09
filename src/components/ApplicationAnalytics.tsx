'use client';
import { usePathname } from 'next/navigation';
export default function ApplicationAnalytics() {
  const pathname = usePathname();
  // Public capability links must not be exposed to third-party analytics scripts.
  if (pathname?.startsWith('/workbook-share')) return null;
  return (
    <>
      <script
        type="module"
        async
        src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fcestos3689back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20"
      />
      <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" />
    </>
  );
}
