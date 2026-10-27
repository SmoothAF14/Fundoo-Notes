import { Archive, Bell, Lightbulb, Search, Tag, Trash2, Users } from 'lucide-react';
import { motion } from 'motion/react';

import { EASE } from '@/lib/motion';

export type IllustrationName = 'notes' | 'reminders' | 'archive' | 'trash' | 'search' | 'shared' | 'label';

/** A little poster: overlapping colour shapes with the section's icon on top. */
const ART: Record<IllustrationName, { icon: React.ComponentType<{ className?: string }>; a: string; b: string }> = {
  notes: { icon: Lightbulb, a: 'bg-butter', b: 'bg-cobalt' },
  reminders: { icon: Bell, a: 'bg-lilac', b: 'bg-tomato' },
  shared: { icon: Users, a: 'bg-mint', b: 'bg-cobalt' },
  archive: { icon: Archive, a: 'bg-butter', b: 'bg-mint' },
  trash: { icon: Trash2, a: 'bg-lilac', b: 'bg-butter' },
  search: { icon: Search, a: 'bg-mint', b: 'bg-tomato' },
  label: { icon: Tag, a: 'bg-tomato', b: 'bg-butter' },
};

function Illustration({ name }: { name: IllustrationName }) {
  const { icon: Icon, a, b } = ART[name];
  return (
    <div aria-hidden="true" className="relative h-36 w-44">
      <span className={`absolute left-0 top-4 size-28 rounded-[46%_54%_58%_42%/52%_40%_60%_48%] ${a}`} />
      <span className={`absolute bottom-0 right-2 size-20 rounded-full ${b}`} />
      <span className="absolute left-12 top-10 flex size-16 items-center justify-center rounded-[22px] border-2 border-ink bg-white text-ink shadow-[0_4px_0_var(--ink)]">
        <Icon className="size-7" />
      </span>
    </div>
  );
}

export function EmptyState({ illustration, title, children }: { illustration: IllustrationName; title: string; children?: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex flex-col items-start px-1 py-14"
    >
      <Illustration name={illustration} />
      <h2 className="display mt-8 max-w-xl text-[clamp(34px,4.5vw,56px)]">{title}</h2>
      {children ? <div className="mt-3 max-w-md text-base text-muted-foreground">{children}</div> : null}
    </motion.section>
  );
}
