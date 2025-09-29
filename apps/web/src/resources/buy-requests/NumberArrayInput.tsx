import { FormControl, FormError, FormField, FormLabel } from "@/shared/components/admin/form";
import { InputHelperText } from "@/shared/components/admin/input-helper-text";
import { Textarea } from "@/shared/components/ui/textarea";
import { FieldTitle, type InputProps, useInput, useResourceContext } from "ra-core";
import { useState } from "react";

interface NumberArrayInputProps extends Omit<InputProps, "format" | "parse"> {
  source: string;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  validate?: any[];
  className?: string;
  resource?: string;
}

const parseNumberArray = (input: any): number[] => {
  if (Array.isArray(input)) {
    return input.filter((item) => typeof item === "number" && !Number.isNaN(item) && Number.isFinite(item));
  }

  if (typeof input !== "string") {
    return [];
  }

  if (!input || !input.trim()) return [];

  return input
    .split(/[^\d.-]+/)
    .map((str) => str.trim())
    .filter((str) => str.length > 0)
    .map((str) => Number(str))
    .filter((num) => !Number.isNaN(num) && Number.isFinite(num));
};

const formatNumberArray = (value: any): string => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return "";
};

export const NumberArrayInput = (props: NumberArrayInputProps) => {
  const { label, source, className, helperText, resource: resourceProp, validate, ...rest } = props;

  const resource = useResourceContext({ resource: resourceProp });

  const { id, field, isRequired } = useInput({
    ...props,
    format: formatNumberArray,
    parse: parseNumberArray,
  });

  const [displayValue, setDisplayValue] = useState<string>(() => formatNumberArray(field.value));

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;

    setDisplayValue(value);
    field.onChange(value);
  };

  return (
    <FormField id={id} className={className} name={field.name}>
      {label !== false && (
        <FormLabel>
          <FieldTitle label={label} source={source} resource={resource} isRequired={isRequired} />
        </FormLabel>
      )}
      <FormControl>
        <Textarea
          {...rest}
          id={id}
          value={displayValue}
          onChange={handleChange}
          placeholder="Enter numbers separated by commas, spaces, or other characters"
        />
      </FormControl>
      <InputHelperText
        helperText={
          helperText ||
          "Enter numbers separated by commas, spaces, or other characters (e.g., '1, 2, 3' or '1 2 3' or '1;2;3')"
        }
      />
      <FormError />
    </FormField>
  );
};
