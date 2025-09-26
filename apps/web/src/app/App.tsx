import { Admin, EditGuesser, ListGuesser, ShowGuesser } from "@/shared/components/admin";
import { Resource } from "ra-core";
import { authProvider } from "./authProvider";
import { dataProvider } from "./dataProvider";

function App() {
  return (
    <Admin dataProvider={dataProvider} authProvider={authProvider}>
      <Resource name="users" list={ListGuesser} edit={EditGuesser} show={ShowGuesser} />
    </Admin>
  );
}

export default App;
