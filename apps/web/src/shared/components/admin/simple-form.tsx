import { CancelButton } from "@/shared/components/admin/cancel-button";
import { SaveButton } from "@/shared/components/admin/form";
import { cn } from "@/shared/lib/utils";
import { Form, type FormProps } from "ra-core";
import type * as React from "react";
import { Children, type ReactNode } from "react";

export const SimpleForm = ({
  children,
  className,
  toolbar = defaultFormToolbar,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  toolbar?: ReactNode;
} & FormProps) => (
  <Form className={cn("flex flex-col gap-6 w-full max-w-lg", className)} {...rest}>
    {children}
    {toolbar}
  </Form>
);

export const FormToolbar = ({ children, className, ...rest }: FormToolbarProps) => (
  <div
    {...rest}
    className={cn(
      "sticky pt-4 pb-4 md:block md:pt-2 md:pb-0 bottom-0 bg-linear-to-b from-transparent to-background to-10%",
      className,
    )}
    role="toolbar"
  >
    {Children.count(children) === 0 ? (
      <div className="flex flex-row gap-2 justify-start">
        <CancelButton />
        <SaveButton />
      </div>
    ) : (
      children
    )}
  </div>
);

export interface FormToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

const defaultFormToolbar = <FormToolbar />;
