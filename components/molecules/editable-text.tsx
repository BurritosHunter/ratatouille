"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent } from "react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/helpers/utils";

export type ReadonlyVariant = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type EditableTextBaseProps = {
  onCancel?: () => void;
  placeholder?: string;
  ariaLabel?: string;
  variant?: ReadonlyVariant;
  typoOverride?: string;
  disabled?: boolean; /* Default false */
  className?: string;
};

export type EditableTextControlledProps = EditableTextBaseProps & {
  /** Controlled: parent owns the string (e.g. local React state). */
  value: string;
  onCommit: (nextValue: string) => void;
  name?: undefined;
  defaultValue?: undefined;
};

export type EditableTextFormProps = EditableTextBaseProps & {
  /** Form: committed value + hidden input for `FormData` (no parent state). Remount when server `defaultValue` changes (e.g. `key={recipe.id}`). */
  name: string;
  defaultValue?: string;
  onCommit?: (nextValue: string) => void;
  value?: undefined;
};

export type EditableTextProps = EditableTextControlledProps | EditableTextFormProps;

export function EditableText(props: EditableTextProps) {
  const isFormMode = "name" in props && props.name != null;
  const withField = isFormMode ?? true;

  const baseId = useId();
  const inputReference = useRef<HTMLInputElement>(null);
  const commitFromKeyboardReference = useRef(false); /* Avoids firing `onCommit` twice when Enter triggers both keydown and blur */
  const cancelFromKeyboardReference = useRef(false); /* Avoids committing when Escape dismisses the input (blur still runs) */
  const [isEditing, setIsEditing] = useState(false);
  const [formCommitted, setFormCommitted] = useState(() => isFormMode ? (props.defaultValue ?? "") : "");
  const [draftOverride, setDraftOverride] = useState<string | null>(null);

  const value = isFormMode ? formCommitted : props.value;
  const draft = draftOverride ?? value;
  const isEmpty = value.trim() === "";
  const showInput = !props.disabled && (isEditing || isEmpty);

  const onCommit = useCallback(
    (nextValue: string) => {
      if (isFormMode) {
        setFormCommitted(nextValue);
        props.onCommit?.(nextValue);
        return;
      }
      props.onCommit(nextValue);
    },
    [isFormMode, props]
  );

  const enterEdit = useCallback(() => {
    if (props.disabled) return;
    setDraftOverride(value);
    setIsEditing(true);
  }, [props.disabled, value]);

  const handleDisplayFocus = useCallback(() => {
    if (props.disabled) return;
    enterEdit();
  }, [enterEdit, props.disabled]);

  const handleDisplayKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (props.disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        enterEdit();
      }
    },
    [enterEdit, props.disabled]
  );

  useEffect(() => {
    if (!isEditing) return;
    const input = inputReference.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [isEditing]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    onCommit(trimmed);
    setDraftOverride(null);
    setIsEditing(false);
  }, [draft, onCommit]);

  const handleBlur = useCallback(() => {
    if (commitFromKeyboardReference.current) {
      commitFromKeyboardReference.current = false;
      return;
    }
    if (cancelFromKeyboardReference.current) {
      cancelFromKeyboardReference.current = false;
      return;
    }
    commit();
  }, [commit]);

  const cancel = useCallback(() => {
    cancelFromKeyboardReference.current = true;
    setDraftOverride(null);
    setIsEditing(false);
    props.onCancel?.();
  }, [props]);

  const hiddenFormValue = isFormMode ? (showInput ? draft : formCommitted) : null;

  const hiddenInput =
    isFormMode && props.name ? (
      <input type="hidden" name={props.name} value={hiddenFormValue ?? ""} />
    ) : null;

  const displayText = value.trim() === "" ? (props.placeholder ?? "—") : value;

  const variantTag = props.variant ?? "p";
  const displaySurfaceClassName = cn(
    "inline-flex max-w-full min-w-0 cursor-text rounded-md text-left text-base transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/50",
    props.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
    value.trim() === "" && "text-muted-foreground",
    props.className
  );

  const control = showInput ? (
    <Input
      ref={inputReference}
      id={`${baseId}-input`}
      value={draft}
      placeholder={draft.trim() === "" ? props.placeholder : undefined}
      disabled={props.disabled}
      aria-label={props.ariaLabel ?? "Edit text"}
      className={cn("h-auto min-h-9 py-1", props.className, props.typoOverride)}
      onChange={(event) => setDraftOverride(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitFromKeyboardReference.current = true;
          commit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
    />
  ) : (
    createElement(
      variantTag,
      {
        id: `${baseId}-display`,
        className: displaySurfaceClassName,
        role: "button",
        tabIndex: props.disabled ? -1 : 0,
        "aria-disabled": props.disabled || undefined,
        "aria-label": props.ariaLabel ?? "Edit text",
        onClick: enterEdit,
        onFocus: handleDisplayFocus,
        onKeyDown: handleDisplayKeyDown,
      },
      <span className={cn("min-w-0 truncate", props.typoOverride)}>{displayText}</span>
    )
  );

  const inner = (
    <>
      {hiddenInput}
      {control}
    </>
  );
  return withField ? <Field>{inner}</Field> : inner;
}
