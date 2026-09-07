import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-sm border border-line bg-[#0d1013] px-3 text-sm text-ink placeholder:text-[#69737d] transition-colors hover:border-[#3a4651] focus:border-signal disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
