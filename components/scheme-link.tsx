import type { ComponentProps } from 'react';

// Use full document navigation for scheme pages: vinext's RSC prefetch can
// fail on Pages. Native anchors also work before hydration and in webviews.
export function SchemeLink({ children, ...props }: ComponentProps<'a'>) {
  return <a {...props}>{children}</a>;
}
