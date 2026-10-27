import { LayoutGrid, LogOut, Menu, Rows3, Search, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/providers/useAuth';
import { useSignOut } from '@/app/providers/useSignOut';
import { useAppDispatch, useAppSelector } from '@/app/store';
import { fetchLabels } from '@/app/store/labelsSlice';
import { fetchNotes } from '@/app/store/notesSlice';
import { Brand } from '@/components/Brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LabelsManager } from '@/features/labels/LabelsManager';
import type { ShellContext } from '@/features/notes/NotesBoard';
import { cn } from '@/lib/utils';

import { Invitations } from './Invitations';
import { Sidebar } from './Sidebar';
import { useReminderAlerts } from './useReminderAlerts';

function readPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preferences are a convenience; ignore storage failures.
  }
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function SearchBox({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const onSearch = pathname === '/search';
  const [value, setValue] = useState(onSearch ? params.get('q') ?? '' : '');

  // Keep the box in sync when navigating away from / back to search.
  const urlQuery = onSearch ? params.get('q') ?? '' : '';
  const [synced, setSynced] = useState(urlQuery);
  if (urlQuery !== synced) {
    setSynced(urlQuery);
    setValue(urlQuery);
  }

  const update = (q: string) => {
    setValue(q);
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search', { replace: onSearch });
  };

  return (
    <div className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-4.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="global-search" className="sr-only">
        Search notes
      </label>
      <input
        id="global-search"
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            update('');
          }
        }}
        placeholder="Search"
        autoComplete="off"
        className="h-12 w-full rounded-full border-2 border-transparent bg-card pl-11 pr-20 text-[15px] placeholder:text-muted-foreground transition-colors focus:border-outline focus:outline-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-full bg-foreground/[0.07] px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:block">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const notes = useAppSelector((s) => s.notes.items);
  const searchRef = useRef<HTMLInputElement>(null);

  const [collapsed, setCollapsed] = useState(() => readPref('fundoo.sidebar', 'open', ['open', 'collapsed'] as const) === 'collapsed');
  const [layout, setLayout] = useState<ShellContext['layout']>(() => readPref('fundoo.layout', 'grid', ['grid', 'list'] as const));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editLabels, setEditLabels] = useState(false);

  useEffect(() => {
    void dispatch(fetchNotes());
    void dispatch(fetchLabels());
  }, [dispatch]);

  useReminderAlerts(notes);

  // ⌘K / Ctrl+K focuses search from anywhere in the workspace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed((c) => {
        writePref('fundoo.sidebar', c ? 'open' : 'collapsed');
        return !c;
      });
    } else {
      setMobileOpen(true);
    }
  };

  const toggleLayout = () =>
    setLayout((l) => {
      const next = l === 'grid' ? 'list' : 'grid';
      writePref('fundoo.layout', next);
      return next;
    });

  const context: ShellContext = { layout };

  return (
    <div className="min-h-dvh bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
        <div className="flex h-20 items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Main menu" className="size-10 rounded-full">
                <Menu />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Main menu</TooltipContent>
          </Tooltip>
          <Brand to="/notes" className="mr-2 hidden sm:inline-flex lg:w-[188px]" />
          <div className="flex min-w-0 flex-1 justify-center">
            <SearchBox inputRef={searchRef} />
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleLayout}
                  aria-label={layout === 'grid' ? 'List view' : 'Grid view'}
                  className="hidden size-10 rounded-full md:inline-flex"
                >
                  {layout === 'grid' ? <Rows3 /> : <LayoutGrid />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{layout === 'grid' ? 'List view' : 'Grid view'}</TooltipContent>
            </Tooltip>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Invitations />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="ml-1 size-10 rounded-full">
                  <span className="flex size-9 items-center justify-center rounded-full bg-cobalt text-sm font-bold text-white">
                    {(user?.username || '?').charAt(0).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-medium">{user?.username}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="relative z-[1] flex">
        <aside
          className={cn(
            'sticky top-20 hidden h-[calc(100dvh-5rem)] shrink-0 overflow-y-auto overflow-x-hidden py-4 transition-[width] duration-200 ease-[cubic-bezier(0.2,0.7,0.1,1)] lg:block',
            collapsed ? 'w-[84px] px-5' : 'w-[272px] px-4'
          )}
          aria-label="Sidebar"
        >
          <Sidebar collapsed={collapsed} onEditLabels={() => setEditLabels(true)} />
        </aside>

        <main id="main" className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10">
          <Outlet key={pathname} context={context} />
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[290px] p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle asChild>
              <div>
                <Brand to="/notes" />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Navigate between notes, labels, archive and trash</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-4">
            <Sidebar
              onNavigate={() => setMobileOpen(false)}
              onEditLabels={() => {
                setMobileOpen(false);
                setEditLabels(true);
              }}
            />
            <div className="mt-6 flex items-center justify-between border-t border-border px-2 pt-4 sm:hidden">
              <span className="text-[13px] font-semibold text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={editLabels} onOpenChange={setEditLabels}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit labels</DialogTitle>
            <DialogDescription>Create, rename or delete labels.</DialogDescription>
          </DialogHeader>
          <LabelsManager onNavigate={() => setEditLabels(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
