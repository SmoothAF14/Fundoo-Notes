import { Archive, Bell, Lightbulb, Pencil, Tag, Trash2, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const PRIMARY: Item[] = [
  { to: '/notes', label: 'Notes', icon: Lightbulb },
  { to: '/reminders', label: 'Reminders', icon: Bell },
  { to: '/shared', label: 'Shared with me', icon: Users },
];
const SECONDARY: Item[] = [
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/trash', label: 'Trash', icon: Trash2 },
];

const itemClass = (active: boolean, collapsed: boolean) =>
  cn(
    'flex h-11 items-center gap-3 rounded-full text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    collapsed ? 'w-11 justify-center' : 'pl-4 pr-5',
    active ? 'bg-foreground text-background' : 'text-foreground/80 hover:bg-foreground/[0.07] hover:text-foreground'
  );

function SideItem({ item, collapsed, active, onNavigate }: { item: Item; collapsed: boolean; active?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) => itemClass(active ?? isActive, collapsed)}
    >
      <Icon className="size-[18px] shrink-0" />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

type SidebarProps = { collapsed?: boolean; onNavigate?: () => void; onEditLabels: () => void };

export function Sidebar({ collapsed = false, onNavigate, onEditLabels }: SidebarProps) {
  const labels = useAppSelector((s) => s.labels.items);
  // The sidebar sits above the label route, so read the active label from the path.
  const { pathname } = useLocation();
  const name = pathname.startsWith('/label/') ? decodeURIComponent(pathname.slice('/label/'.length)) : undefined;

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {PRIMARY.map((item) => (
        <SideItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}

      <div className={cn('mb-1 mt-6', collapsed ? 'mx-auto h-0.5 w-6 rounded-full bg-border' : 'px-4')}>
        {collapsed ? null : <p className="font-display text-lg font-extrabold tracking-[-0.03em]">Labels</p>}
      </div>
      {labels.map((l) => (
        <SideItem
          key={l.label_id}
          item={{ to: `/label/${encodeURIComponent(l.title)}`, label: l.title, icon: Tag }}
          active={name?.toLowerCase() === l.title.toLowerCase()}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={onEditLabels} aria-label="Edit labels" className={itemClass(false, true)}>
              <Pencil className="size-[18px]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Edit labels</TooltipContent>
        </Tooltip>
      ) : (
        <button type="button" onClick={onEditLabels} className={cn(itemClass(false, false), 'cursor-pointer')}>
          <Pencil className="size-[18px] shrink-0" />
          Edit labels
        </button>
      )}

      <div className="mt-4" />
      {SECONDARY.map((item) => (
        <SideItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}
