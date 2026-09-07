import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-signal text-[#05211d] hover:bg-[#91d6ca]",
        secondary: "border border-line bg-raised text-ink hover:bg-[#20272e]",
        ghost: "text-muted hover:bg-raised hover:text-ink",
        danger: "border border-risk-high/40 bg-risk-high/10 text-[#f2a3a3] hover:bg-risk-high/20"
      }
    },
    defaultVariants: { variant: "primary" }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />;
}
