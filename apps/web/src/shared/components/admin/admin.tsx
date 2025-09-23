import { AuthCallback } from "@/shared/components/admin/authentication";
import { Layout } from "@/shared/components/admin/layout";
import { LoginPage } from "@/shared/components/admin/login-page";
import { Ready } from "@/shared/components/admin/ready";
import { ThemeProvider } from "@/shared/components/admin/theme-provider";
import { i18nProvider as defaultI18nProvider } from "@/shared/lib/i18nProvider";
import {
  CoreAdminContext,
  type CoreAdminContextProps,
  type CoreAdminProps,
  CoreAdminUI,
  type CoreAdminUIProps,
  localStorageStore,
} from "ra-core";

const defaultStore = localStorageStore();

const AdminContext = (props: CoreAdminContextProps) => <CoreAdminContext {...props} />;

const AdminUI = (props: CoreAdminUIProps) => (
  <ThemeProvider>
    <CoreAdminUI layout={Layout} loginPage={LoginPage} ready={Ready} authCallbackPage={AuthCallback} {...props} />
  </ThemeProvider>
);

export const Admin = (props: CoreAdminProps) => {
  const {
    accessDenied,
    authCallbackPage = AuthCallback,
    authenticationError,
    authProvider,
    basename,
    catchAll,
    children,
    dashboard,
    dataProvider,
    disableTelemetry,
    error,
    i18nProvider = defaultI18nProvider,
    layout = Layout,
    loading,
    loginPage = LoginPage,
    queryClient,
    ready = Ready,
    requireAuth,
    store = defaultStore,
    title = "Shadcn Admin",
  } = props;
  return (
    <AdminContext
      authProvider={authProvider}
      basename={basename}
      dataProvider={dataProvider}
      i18nProvider={i18nProvider}
      queryClient={queryClient}
      store={store}
    >
      <AdminUI
        accessDenied={accessDenied}
        authCallbackPage={authCallbackPage}
        authenticationError={authenticationError}
        catchAll={catchAll}
        dashboard={dashboard}
        disableTelemetry={disableTelemetry}
        error={error}
        layout={layout}
        loading={loading}
        loginPage={loginPage}
        ready={ready}
        requireAuth={requireAuth}
        title={title}
      >
        {children}
      </AdminUI>
    </AdminContext>
  );
};
