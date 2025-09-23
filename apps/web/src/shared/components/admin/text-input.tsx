import { FormControl, FormError, FormField, FormLabel } from "@/shared/components/admin/form";
import { InputHelperText } from "@/shared/components/admin/input-helper-text";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { FieldTitle, type InputProps, useInput, useResourceContext } from "ra-core";

export type TextInputProps = InputProps & {
  multiline?: boolean;
} & React.ComponentProps<"textarea"> &
  React.ComponentProps<"input">;

export const TextInput = (props: TextInputProps) => {
  const resource = useResourceContext(props);
  const { label, source, multiline, className, validate: _validateProp, format: _formatProp, ...rest } = props;
  const { id, field, isRequired } = useInput(props);

  return (
    <FormField id={id} className={className} name={field.name}>
      {label !== false && (
        <FormLabel>
          <FieldTitle label={label} source={source} resource={resource} isRequired={isRequired} />
        </FormLabel>
      )}
      <FormControl>{multiline ? <Textarea {...rest} {...field} /> : <Input {...rest} {...field} />}</FormControl>
      <InputHelperText helperText={props.helperText} />
      <FormError />
    </FormField>
  );
};
