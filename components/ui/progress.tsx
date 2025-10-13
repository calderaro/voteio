import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="progress"
      className={cn(
        "bg-muted relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full w-full origin-left transition-transform duration-300 ease-in-out"
        style={{
          transform: `scaleX(${Math.min(Math.max(value, 0), 100) / 100})`,
        }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress };
