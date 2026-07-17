"use client";

import { Input, cn } from "@aypros/ui";
import { useId, useMemo, useRef, useState } from "react";
import { PiCaretDown } from "react-icons/pi";

type AutocompleteInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  inputClassName?: string;
  options: string[];
  emptyMessage?: string;
  minQueryLength?: number;
  disabled?: boolean;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete = "new-password",
  inputClassName,
  options,
  emptyMessage = "Nenhuma opcao encontrada",
  minQueryLength = 0,
  disabled,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldName = `aypros-${useId().replace(/:/g, "")}`;
  const query = value.trim();
  const shouldShowOptions = query.length >= minQueryLength;
  const filteredOptions = useMemo(() => {
    if (!shouldShowOptions) return [];
    const normalizedQuery = normalize(query);
    return options.filter((option) => normalize(option).includes(normalizedQuery)).slice(0, 40);
  }, [options, query, shouldShowOptions]);

  const hasOptions = filteredOptions.length > 0;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        name={fieldName}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue);
          setOpen(true);
        }}
        onMouseDown={(event) => {
          if (document.activeElement === event.currentTarget) return;
          event.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 100);
          onBlur?.();
        }}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={disabled}
        role="combobox"
        aria-expanded={open && shouldShowOptions}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        className={cn("cursor-pointer pr-9", inputClassName)}
      />
      <PiCaretDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      {open && shouldShowOptions && !disabled ? (
        <div
          id={`${id}-options`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {hasOptions ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                className={cn(
                  "flex w-full cursor-pointer items-center rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  option === value && "bg-accent text-accent-foreground",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-2 py-3 text-sm text-muted-foreground">{emptyMessage}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
