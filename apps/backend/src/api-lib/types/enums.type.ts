import { Type } from "@sinclair/typebox";

// Example enum - replace with your own
export const ExampleEnumSchema = Type.String({
  $id: "ExampleEnum",
  enum: ["VALUE1", "VALUE2"],
  title: "Example enum",
  description: "An example enum",
});
