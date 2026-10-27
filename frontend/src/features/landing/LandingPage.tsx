import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/providers/useAuth';
import { Brand } from '@/components/Brand';
import { SiteFooter } from '@/components/SiteFooter';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { EASE } from '@/lib/motion';

const MARQUEE = ['Labels', 'Reminders', 'Instant search', 'Share & collaborate', 'Archive', 'Pin what matters'];

const STEPS = [
  { n: '01', title: 'Jot it down', text: 'Hit “Take a note…” and type. Titles, lists, half-formed ideas — all welcome.', className: 'bg-butter rounded-[44px_44px_44px_12px]' },
  { n: '02', title: 'Make it findable', text: 'Colour it, label it, pin it. ⌘K finds anything you’ve ever written.', className: 'bg-mint rounded-[44px]' },
  { n: '03', title: 'Bring people in', text: 'Share a note with view or edit access. Archive it when it’s done.', className: 'bg-lilac rounded-[12px_44px_44px_44px]' },
];

function Sticker({ title, body, chip, className, delay }: { title: string; body: string; chip: string; className: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, rotate: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={`absolute w-60 rounded-[30px] border-2 border-ink p-5 text-[14px] leading-snug text-ink shadow-[0_4px_0_var(--ink)] ${className}`}
    >
      <p className="font-display text-[22px] font-extrabold tracking-[-0.035em]">{title}</p>
      <p className="mt-1.5">{body}</p>
      <span className="mt-3 inline-block rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">{chip}</span>
    </motion.div>
  );
}

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const primaryCta = isAuthenticated ? { to: '/notes', label: 'Open your notes' } : { to: '/register', label: 'Start writing — free' };

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-6 sm:px-10">
        <Brand />
        <nav aria-label="Account" className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button asChild>
              <Link to="/notes">Open notes</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-6 sm:px-10 lg:min-h-[640px]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-6 hidden size-[440px] rounded-[46%_54%_58%_42%/52%_40%_60%_48%] bg-butter lg:block" />
          <div aria-hidden="true" className="pointer-events-none absolute right-[330px] top-[330px] hidden size-44 rounded-full bg-mint lg:block" />
          <div aria-hidden="true" className="absolute right-16 top-24 hidden h-[420px] w-[340px] lg:block">
            <Sticker title="Groceries" body="Sourdough, figs, the good olive oil." chip="Home" className="left-0 top-0 -rotate-6 bg-white" delay={0.35} />
            <Sticker title="Ship it." body="Redesign behind a flag, feedback for a week." chip="Fri · 9 AM" className="left-24 top-44 rotate-[5deg] bg-lilac" delay={0.5} />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="display relative z-[2] text-[clamp(84px,14.5vw,230px)]"
          >
            Think{' '}
            <br />
            it
            <span aria-hidden="true" className="mx-[0.04em] inline-block h-[0.62em] w-[0.8em] rounded-full bg-tomato align-[0.06em]" />,{' '}
            <br />
            <span className="text-brand">keep it.</span>
          </motion.h1>

          <div className="relative z-[2] mt-10 flex flex-col gap-8 sm:mt-12 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-[400px] text-lg leading-relaxed text-foreground/80 sm:text-[19px]">
              Notes, lists and plans that stay out of your way — labelled, searchable, and shared when you want a second brain.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="brand" size="lg">
                <Link to={primaryCta.to}>
                  {primaryCta.label} <ArrowRight />
                </Link>
              </Button>
              {!isAuthenticated ? (
                <Button asChild variant="outline" size="lg">
                  <Link to="/login">I have an account</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="mx-auto max-w-[1400px] px-5 sm:px-10" aria-hidden="true">
          <div className="overflow-hidden rounded-full bg-ink py-5 text-paper dark:bg-paper dark:text-ink">
            <div className="marquee-track flex w-max gap-10 whitespace-nowrap pl-10 font-display text-[clamp(22px,2.6vw,32px)] font-semibold tracking-[-0.02em]">
              {[...MARQUEE, ...MARQUEE].map((item, i) => (
                <span key={i} className="flex items-center gap-10">
                  {item}
                  <span className="text-butter dark:text-tomato">✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="mx-auto max-w-[1400px] px-5 pb-10 pt-28 sm:px-10">
          <h2 id="how-heading" className="display max-w-3xl text-[clamp(48px,7vw,104px)]">
            Simple on <span className="text-brand">purpose.</span>
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.article
                key={s.n}
                initial={{ y: 24 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, ease: EASE, delay: i * 0.08 }}
                className={`flex min-h-[300px] flex-col justify-between p-8 text-ink ${s.className}`}
              >
                <span className="font-display text-6xl font-extrabold tracking-[-0.05em] opacity-90">{s.n}</span>
                <div>
                  <h3 className="font-display text-3xl font-extrabold tracking-[-0.035em]">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed">{s.text}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-10">
          <div className="relative overflow-hidden rounded-[48px] bg-cobalt px-8 py-16 text-white sm:px-14 sm:py-20">
            <div aria-hidden="true" className="absolute -bottom-28 -right-20 size-52 rounded-full bg-tomato sm:-bottom-24 sm:-right-16 sm:size-80" />
            <div aria-hidden="true" className="absolute -top-10 right-56 hidden size-24 rounded-full bg-butter md:block" />
            <h2 className="display relative max-w-3xl text-[clamp(44px,6.5vw,96px)]">Your next idea needs a home.</h2>
            <Button asChild size="lg" className="relative mt-10 bg-white text-ink hover:bg-paper">
              <Link to={primaryCta.to}>
                {primaryCta.label} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter height="560px" />
    </div>
  );
}
