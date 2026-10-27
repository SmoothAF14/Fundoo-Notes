import { forwardRef } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type IconActionProps = React.ComponentProps<typeof Button> & { label: string; pressed?: boolean };

/** Icon-only button with an accessible name and tooltip; grows to 44px on touch screens. */
export const IconAction = forwardRef<HTMLButtonElement, IconActionProps>(function IconAction(
  { label, pressed, className, children, ...rest },
  ref
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={pressed}
          className={cn('size-10 rounded-full text-current opacity-80 hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)] hover:opacity-100 pointer-coarse:size-11', className)}
          {...rest}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
});
