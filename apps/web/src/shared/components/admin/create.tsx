import { Breadcrumb, BreadcrumbItem, BreadcrumbPage } from "@/shared/components/admin/breadcrumb";
import { cn } from "@/shared/lib/utils";
import {
  CreateBase,
  type CreateBaseProps,
  Translate,
  useCreateContext,
  useCreatePath,
  useGetResourceLabel,
  useHasDashboard,
  useResourceContext,
} from "ra-core";
import type { ReactNode } from "react";
import { Link } from "react-router";

export type CreateProps = CreateViewProps & CreateBaseProps;

export const Create = ({ title, children, actions, className, ...rest }: CreateProps) => (
  <CreateBase {...rest}>
    <CreateView title={title} actions={actions} className={className}>
      {children}
    </CreateView>
  </CreateBase>
);

export type CreateViewProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: ReactNode | string | false;
};

export const CreateView = ({ actions, title, children, className }: CreateViewProps) => {
  const context = useCreateContext();

  const resource = useResourceContext();
  if (!resource) {
    throw new Error("The CreateView component must be used within a ResourceContextProvider");
  }
  const getResourceLabel = useGetResourceLabel();
  const listLabel = getResourceLabel(resource, 2);
  const createPath = useCreatePath();
  const listLink = createPath({
    resource,
    type: "list",
  });
  const hasDashboard = useHasDashboard();

  return (
    <>
      <Breadcrumb>
        {hasDashboard && (
          <BreadcrumbItem>
            <Link to="/">
              <Translate i18nKey="ra.page.dashboard">Home</Translate>
            </Link>
          </BreadcrumbItem>
        )}
        <BreadcrumbItem>
          <Link to={listLink}>{listLabel}</Link>
        </BreadcrumbItem>
        <BreadcrumbPage>
          <Translate i18nKey="ra.action.create">Create</Translate>
        </BreadcrumbPage>
      </Breadcrumb>
      <div className={cn("flex justify-between items-start flex-wrap gap-2 my-2", className)}>
        <h2 className="text-2xl font-bold tracking-tight">{title !== undefined ? title : context.defaultTitle}</h2>
        {actions}
      </div>
      <div className="my-2">{children}</div>
    </>
  );
};
