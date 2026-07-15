"use client";

import { Button, type ButtonProps } from "@aypros/ui";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, loadingText, ...props }: ButtonProps & { loadingText: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending} {...props}>
      {pending ? loadingText : children}
    </Button>
  );
}
