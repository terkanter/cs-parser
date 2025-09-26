import { Admin, EditGuesser, ListGuesser, ShowGuesser } from "@/shared/components/admin";
import { CustomRoutes, Resource } from "ra-core";
import { Route } from "react-router";
import { UserSettings } from "../UserSettings";
import { authProvider } from "./authProvider";
import { dataProvider } from "./dataProvider";

function App() {
  return (
    <Admin dataProvider={dataProvider} authProvider={authProvider}>
      <Resource name="buy-requests" list={ListGuesser} edit={EditGuesser} show={ShowGuesser} />
      <CustomRoutes>
        <Route path="/settings" element={<UserSettings />} />
      </CustomRoutes>
    </Admin>
  );
}

export default App;
