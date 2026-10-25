"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { useTabNavigate } from "@/shell/transitions";

type Variant = "primary" | "secondary" | "plain" | "danger" | "stage";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "regular" | "large";
  block?: boolean;
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  variant = "secondary",
  size = "regular",
  block = false,
  icon,
  loading = false,
  loadingLabel,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("hi-btn", `hi-btn--${variant}`, className)}
      data-size={size}
      data-block={block ? "true" : undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="hi-spinner" aria-hidden /> : icon}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  size = "regular",
  block = false,
  icon,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: "regular" | "large";
  block?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const go = useTabNavigate();
  return (
    <Link
      href={href}
      replace
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(href);
      }}
      className={cx("hi-btn", `hi-btn--${variant}`)}
      data-size={size}
      data-block={block ? "true" : undefined}
    >
      {icon}
      {children}
    </Link>
  );
}

/** A round control that floats over content in glass; always named for screen readers. */
export function GlassButton({
  label,
  children,
  ...rest
}: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="hi-gbtn" aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
