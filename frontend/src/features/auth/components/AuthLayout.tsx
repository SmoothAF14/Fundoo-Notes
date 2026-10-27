import { Brand } from '@/components/Brand';
import { Page } from '@/components/Page';
import { SiteFooter } from '@/components/SiteFooter';
import { ThemeToggle } from '@/components/ThemeToggle';

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Big poster headline on the left, an outlined "sticker" form card on the right, footer below. */
export function AuthLayout({ eyebrow, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background">
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-5 py-6 sm:px-10">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="relative mx-auto grid w-full max-w-[1400px] flex-1 items-center gap-10 px-5 pb-16 pt-4 sm:px-10 lg:grid-cols-[1.1fr_480px] lg:gap-16">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-10 hidden size-64 rounded-full bg-butter lg:block" />
        <div className="relative">
          <p className="text-[15px] font-semibold text-brand">{eyebrow}</p>
          <h1 className="display mt-3 text-[clamp(56px,9vw,132px)]">{title}</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-foreground/75">{subtitle}</p>
        </div>
        <Page className="w-full">
          <div className="rounded-[36px] border-2 border-outline bg-card p-6 shadow-[0_6px_0_var(--outline)] sm:p-9">{children}</div>
          {footer ? <div className="mt-6 text-center text-[15px] text-muted-foreground">{footer}</div> : null}
        </Page>
      </main>
      <SiteFooter height="380px" />
    </div>
  );
}
