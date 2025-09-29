import type { FallbackProps } from "react-error-boundary";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion";
import { Button } from "@/shared/components/ui/button";
import { CircleAlert, History } from "lucide-react";
import { Translate, useResetErrorBoundaryOnLocationChange } from "ra-core";
import type { ErrorInfo, HtmlHTMLAttributes } from "react";

export const Error = (props: InternalErrorProps & {}) => {
  const { error, errorInfo, resetErrorBoundary, ...rest } = props;

  useResetErrorBoundaryOnLocationChange(resetErrorBoundary);

  return (
    <div className="flex flex-col items-center md:p-16 gap-5" {...rest}>
      <h1 className="flex items-center text-3xl mt-5 mb-5 gap-3" role="alert">
        <CircleAlert className="w-2em h-2em" />
        <Translate i18nKey="ra.page.error" />
      </h1>
      <div>
        <Translate i18nKey="ra.message.error" />
      </div>
      {import.meta.env.DEV && (
        <>
          <Accordion type="multiple" className="mt-1 p-2 bg-secondary w-full lg:w-150">
            <AccordionItem value="error">
              <AccordionTrigger className="py-2">
                <Translate i18nKey={error.message}>{error.message}</Translate>
              </AccordionTrigger>
              <AccordionContent className="whitespace-pre-wrap pt-1">
                <pre className="text-xls">{errorInfo?.componentStack}</pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="text-center ">Need help with this error? Try the following:</p>
          <div>
            <ul className="list-disc">
              <li>
                Check the{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://marmelab.com/shadcn-admin-kit/docs"
                >
                  shadcn-admin-kit documentation
                </a>
              </li>
              <li>
                Search on{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://stackoverflow.com/questions/tagged/shadcn-admin-kit"
                >
                  StackOverflow
                </a>{" "}
                for community answers
              </li>
              <li>
                Get help from the core team via{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://marmelab.com/shadcn-admin-kit/"
                >
                  Shadcn Enterprise Edition
                </a>
              </li>
            </ul>
          </div>
        </>
      )}
      <div className="mt-8">
        <Button onClick={goBack}>
          <History />
          <Translate i18nKey="ra.action.back" />
        </Button>
      </div>
    </div>
  );
};

interface InternalErrorProps extends Omit<HtmlHTMLAttributes<HTMLDivElement>, "title">, FallbackProps {
  className?: string;
  errorInfo?: ErrorInfo;
}

export interface ErrorProps extends Pick<FallbackProps, "error"> {
  errorInfo?: ErrorInfo;
}

function goBack() {
  window.history.go(-1);
}
