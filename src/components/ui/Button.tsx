"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  /** A pending state is written, never spun. */
  loading?: boolean;
  loadingLabel?: ReactNode;
  icon?: ReactNode;
}

function classes(
  variant: ButtonVariant,
  size: ButtonSize,
  block: boolean | undefined,
  className: string | undefined,
) {
  return cx(
    "hi-btn",
    `hi-btn--${variant}`,
    size !== "md" && `hi-btn--${size}`,
    block && "hi-btn--block",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    block,
    loading = false,
    loadingLabel,
    icon,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes(variant, size, block, className)}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      <span className="hi-btn__label">{loading ? (loadingLabel ?? children) : children}</span>
    </button>
  );
});

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  block,
  icon,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={classes(variant, size, block, className)}>
      {icon}
      <span className="hi-btn__label">{children}</span>
    </Link>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The accessible name; also the tooltip. */
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("hi-iconbtn", className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
});
