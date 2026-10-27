import HalftoneWordmarkFooter, { type FooterColumn } from '@/components/ui/halftone-wordmark-footer';
import { useTheme } from '@/lib/theme-context';

const COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Notes', href: '/notes' },
      { label: 'Reminders', href: '/reminders' },
      { label: 'Labels', href: '/labels' },
      { label: 'Archive', href: '/archive' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '/login' },
      { label: 'Sign up', href: '/register' },
      { label: 'Profile', href: '/profile' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'GitHub', href: 'https://github.com/SmoothAF14' },
      { label: 'chorawalavedant@gmail.com', href: 'mailto:chorawalavedant@gmail.com' },
    ],
  },
];

const DISPLAY = "'Bricolage Grotesque Variable', 'Bricolage Grotesque', system-ui, sans-serif";
const SMALL = "'Inter Variable', 'Inter', system-ui, sans-serif";

/** Halftone footer for the landing and auth pages (not the notes workspace). */
export function SiteFooter({ height }: { height: string }) {
  const { theme } = useTheme();
  return (
    <div className="w-full">
      <HalftoneWordmarkFooter
        wordmark="fundoo"
        label="Fundoo Notes"
        meta="©2026 · Built by Vedant"
        preset={theme === 'dark' ? 'night' : 'paper'}
        palette={theme === 'dark' ? { background: '#121212', ink: '#f3efe6', warm: '#ff5a36' } : { background: '#f3efe6', ink: '#121212', warm: '#2b44ff' }}
        height={height}
        fontFamily={DISPLAY}
        monoFamily={SMALL}
        columns={COLUMNS}
      />
    </div>
  );
}
