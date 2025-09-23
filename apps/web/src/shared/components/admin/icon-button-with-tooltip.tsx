import { useTranslate } from "ra-core";
import type { MouseEvent } from "react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";

/**
 * A Button with a tooltip which ensures the tooltip is closed on click to avoid ghost tooltips
 * when the button position changes.
 */
export const IconButtonWithTooltip = ({ label, onClick, children, disabled, ...props }: IconButtonWithTooltipProps) => {
  const translate = useTranslate();
  const [open, setOpen] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  let translatedLabel = label;
  if (typeof label === "string") {
    translatedLabel = translate(label, { _: label });
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    handleClose();
    onClick?.(event);
  };

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={typeof translatedLabel === "string" ? translatedLabel : undefined}
            onClick={handleClick}
            disabled={disabled}
            onMouseEnter={handleOpen}
            onMouseLeave={handleClose}
            {...props}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{translatedLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export interface IconButtonWithTooltipProps extends React.ComponentProps<"button"> {
  label: React.ReactNode;
  children: React.ReactNode;
}
