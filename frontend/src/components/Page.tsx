import { motion } from 'motion/react';

import { pageMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

/** Route wrapper: fade + 8px rise. Reduced motion is handled globally by <MotionConfig reducedMotion="user">. */
export function Page({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div {...pageMotion} className={cn('relative', className)}>
      {children}
    </motion.div>
  );
}
