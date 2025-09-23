import { FormDescription } from "@/shared/components/admin/form";
import { useTranslate } from "ra-core";
import { type ReactNode, isValidElement } from "react";

export function InputHelperText({ helperText }: { helperText?: ReactNode }) {
  const translate = useTranslate();

  if (!helperText) {
    return null;
  }

  if (isValidElement(helperText)) {
    return helperText;
  }

  return (
    <FormDescription>
      {typeof helperText === "string" ? translate(helperText, { _: helperText }) : helperText}
    </FormDescription>
  );
}
