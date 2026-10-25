"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useId, useRef, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** A row of choices where exactly one is on; arrow keys move between them. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }
  return (
    <div className="hi-seg" role="radiogroup" aria-label={label}>
      {options.map((option, i) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className="hi-seg__opt"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
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

/** One value, lowered and raised a step at a time, with the value large between the two buttons. */
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
    <div
      className="hi-stepper"
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
    >
      <button
        type="button"
        className="hi-stepper__btn"
        aria-label={`Lower ${label}`}
        aria-describedby={id}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus size={20} strokeWidth={2.5} aria-hidden />
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
        <Plus size={20} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}

/**
 * A level from off to `max`, drawn as bars that grow like a volume meter, every
 * bar up to the chosen one in ink. One row at any width; arrow keys move along it.
 */
export function LevelBars({
  value,
  max,
  onChange,
  label,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = Math.min(max, Math.max(0, value + step));
    onChange(next);
    refs.current[next]?.focus();
  }
  return (
    <div className="hi-levels" role="radiogroup" aria-label={label}>
      {Array.from({ length: max + 1 }, (_, level) => {
        const on = level === value;
        return (
          <button
            key={level}
            ref={(el) => {
              refs.current[level] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={level === 0 ? "Off" : `${level} of ${max}`}
            tabIndex={on ? 0 : -1}
            className="hi-levels__opt"
            data-on={on || undefined}
            disabled={disabled}
            onClick={() => onChange(level)}
            onKeyDown={onKeyDown}
          >
            {level === 0 ? (
              <span className="hi-levels__off">Off</span>
            ) : (
              <span
                className="hi-levels__bar"
                data-lit={level <= value || undefined}
                style={{ height: `${10 + level * 5}px` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface Choice<T extends string> {
  value: T;
  title: string;
  sub?: string;
}

/** Large radio cards: each choice is a full row, its state shown by a check as well as color. */
export function ChoiceList<T extends string>({
  choices,
  value,
  onChange,
  label,
}: {
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="hi-choices" role="radiogroup" aria-label={label}>
      {choices.map((choice) => {
        const on = choice.value === value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={on}
            className="hi-choice"
            onClick={() => onChange(choice.value)}
          >
            <span className="hi-choice__body">
              <span className="hi-choice__title">{choice.title}</span>
              {choice.sub ? <span className="hi-choice__sub">{choice.sub}</span> : null}
            </span>
            <span className="hi-choice__mark" aria-hidden>
              {on ? <Check size={17} strokeWidth={3} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Fieldset({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <fieldset className="hi-fieldset">
      <legend className="hi-fieldset__label">{label}</legend>
      {children}
      {hint ? <p className="hi-fieldset__hint">{hint}</p> : null}
      {error ? (
        <p className="hi-fieldset__error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function TextInput({
  invalid,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className="hi-input" aria-invalid={invalid || undefined} {...rest} />;
}
