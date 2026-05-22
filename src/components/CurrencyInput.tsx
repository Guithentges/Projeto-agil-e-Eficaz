import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { digitsToCents, formatCentsDisplay, reaisToCents } from "@/lib/currency-input";

export interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> {
  value: number;
  onValueChange: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, onKeyDown, onFocus, onMouseDown, onSelect, ...props }, ref) => {
    const cents = reaisToCents(value);

    const moveCursorToEnd = (el: HTMLInputElement) => {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange(digitsToCents(e.target.value) / 100);
      requestAnimationFrame(() => moveCursorToEnd(e.target));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        requestAnimationFrame(() => moveCursorToEnd(e.currentTarget));
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        onValueChange(Math.floor(cents / 10) / 100);
        requestAnimationFrame(() => moveCursorToEnd(e.currentTarget));
        return;
      }
      onKeyDown?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatCentsDisplay(cents)}
        onChange={handleChange}
        onMouseDown={(e) => {
          e.preventDefault();
          e.currentTarget.focus();
          requestAnimationFrame(() => moveCursorToEnd(e.currentTarget));
          onMouseDown?.(e);
        }}
        onFocus={(e) => {
          requestAnimationFrame(() => moveCursorToEnd(e.currentTarget));
          onFocus?.(e);
        }}
        onSelect={(e) => {
          requestAnimationFrame(() => moveCursorToEnd(e.currentTarget));
          onSelect?.(e);
        }}
        onKeyDown={handleKeyDown}
        className={cn("tabular-nums", className)}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
