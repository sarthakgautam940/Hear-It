"use client";

import { Minus, Plus } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  block,
  "aria-label": ariaLabel,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  block?: boolean;
  "aria-label": string;
}) {
  return (
    <div
      className={cx("hi-segmented", block && "hi-segmented--block")}
      role="group"
      aria-label={ariaLabel}
      data-disabled={disabled ? "true" : undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="hi-segmented__item"
          aria-pressed={option.value === value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="hi-switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

/** A value on a scale, stepped with a minus and a plus; the words stay large. */
export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  label,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  label: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="hi-stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="hi-stepper__btn"
        aria-label={`Lower ${label}`}
        aria-describedby={id}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus size={18} aria-hidden />
      </button>
      <span className="hi-stepper__value" id={id} aria-live="polite">
        {format(value)}
      </span>
      <button
        type="button"
        className="hi-stepper__btn"
        aria-label={`Raise ${label}`}
        aria-describedby={id}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus size={18} aria-hidden />
      </button>
    </div>
  );
}

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="hi-field">
      <label className="hi-field__label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <span className="hi-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      <span className="hi-field__error" id={errorId} role={error ? "alert" : undefined}>
        {error ?? ""}
      </span>
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} className={cx("hi-input", className)} aria-invalid={invalid || undefined} {...rest} />;
});

export function Banner({
  tone,
  children,
  action,
}: {
  tone: "info" | "caution" | "alarm";
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`hi-banner hi-banner--${tone}`} role={tone === "alarm" ? "alert" : "status"}>
      <span style={{ flex: 1 }}>{children}</span>
      {action}
    </div>
  );
}
