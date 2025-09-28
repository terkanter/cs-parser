import {
  ArrayInput,
  BooleanInput,
  NumberInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
} from "@/shared/components/admin";
import { maxValue, minValue } from "ra-core";
import { NumberArrayInput } from "./NumberArrayInput";

const PaintSeedTierInput = () => (
  <div className="grid grid-cols gap-4">
    <TextInput source="name" label="Name" />
    <NumberArrayInput source="value" label="Value" />
  </div>
);

export const BuyRequestForm = () => (
  <SimpleForm>
    <div className="space-y-6 pt-4 pr-6">
      {/* Basic Information */}
      {/* Query Configuration */}
      <div className="-mx-6 flex-1 border-r">
        <div className="border-t py-6 px-6 space-y-6">
          <BooleanInput source="isActive" label="Active" defaultValue={true} />
        </div>

        <div className="border-t py-3 px-6">
          <h4 className="text-sm font-medium">Items</h4>
          <TextInput source="query.item" label={false} helperText="e.g., AK-47, AWP, etc." />
        </div>
        <div className="border-t py-3 px-6">
          <div className="grid grid-cols-2 gap-4">
            <NumberInput source="query.price.gte" label="Min Price ($)" validate={[minValue(0)]} />
            <NumberInput source="query.price.lte" label="Max Price ($)" validate={[minValue(0)]} />
          </div>
        </div>
        <div className="border-t py-3 px-6">
          <div className="grid grid-cols-2 gap-4">
            <NumberInput source="query.float.gte" label="Min Float" validate={[minValue(0), maxValue(1)]} step={0.01} />
            <NumberInput source="query.float.lte" label="Max Float" validate={[minValue(0), maxValue(1)]} step={0.01} />
          </div>
        </div>
        {/* Paint Seed Tiers */}
        <div className="border-t py-3 px-6 border-b">
          <h4 className="text-sm font-medium mb-2">Paint Seed Tiers</h4>
          <ArrayInput source="query.paint_seed" label={false}>
            <SimpleFormIterator>
              <PaintSeedTierInput />
            </SimpleFormIterator>
          </ArrayInput>
        </div>
      </div>
    </div>
  </SimpleForm>
);
