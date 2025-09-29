import { BuyRequestCreate, BuyRequestEdit, BuyRequestList, BuyRequestShow } from "@/resources/buy-requests";
import { UserSettings } from "@/resources/user-settings";
import { Admin, SignupPage } from "@/shared/components/admin";
import { CustomRoutes, Resource } from "ra-core";
import { Route, RouterProvider, createBrowserRouter } from "react-router";
import { authProvider } from "./authProvider";
import { dataProvider } from "./dataProvider";

function App() {
  const router = createBrowserRouter([
    {
      path: "/signup",
      element: <SignupPage />,
    },
    {
      path: "*",
      element: (
        <Admin dataProvider={dataProvider} authProvider={authProvider}>
          <Resource
            name="buy-requests"
            list={BuyRequestList}
            create={BuyRequestCreate}
            edit={BuyRequestEdit}
            show={BuyRequestShow}
          />
          <CustomRoutes>
            <Route path="/settings" element={<UserSettings />} />
          </CustomRoutes>
        </Admin>
      ),
    },
  ]);
  return <RouterProvider router={router} />;
}

export default App;
