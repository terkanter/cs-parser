import {
  ArrayInput,
  BooleanInput,
  NumberInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
} from "@/shared/components/admin";
import { maxValue, minValue } from "ra-core";

const qualityChoices = [
  { id: "FN", name: "Factory New" },
  { id: "MW", name: "Minimal Wear" },
  { id: "FT", name: "Field-Tested" },
  { id: "WW", name: "Well-Worn" },
  { id: "BS", name: "Battle-Scarred" },
];

const PriceRangeInput = () => (
  <div className="grid grid-cols-2 gap-4">
    <NumberInput source="gte" label="Min Price ($)" validate={[minValue(0)]} />
    <NumberInput source="lte" label="Max Price ($)" validate={[minValue(0)]} />
  </div>
);

const FloatRangeInput = () => (
  <div className="grid grid-cols-2 gap-4">
    <NumberInput source="gte" label="Min Float" validate={[minValue(0), maxValue(1)]} step={0.01} />
    <NumberInput source="lte" label="Max Float" validate={[minValue(0), maxValue(1)]} step={0.01} />
  </div>
);

const PaintSeedRangeInput = () => (
  <div className="grid grid-cols-2 gap-4">
    <NumberInput source="gte" label="Min Paint Seed" validate={[minValue(0)]} />
    <NumberInput source="lte" label="Max Paint Seed" validate={[minValue(0)]} />
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
          <ArrayInput source="query.item" label="">
            <SimpleFormIterator>
              <TextInput source="" label={false} helperText="e.g., AK-47, AWP, etc." />
            </SimpleFormIterator>
          </ArrayInput>
        </div>
        {/* Price Ranges */}
        <div className="border-t py-3 px-6">
          <h4 className="text-sm font-medium">Price Ranges</h4>
          <ArrayInput source="query.price" label={false}>
            <SimpleFormIterator>
              <PriceRangeInput />
            </SimpleFormIterator>
          </ArrayInput>
        </div>
        {/* Float Ranges */}
        <div className="border-t py-3 px-6">
          <h4 className="text-sm font-medium">Float Ranges</h4>
          <ArrayInput source="query.float" label={false}>
            <SimpleFormIterator>
              <FloatRangeInput />
            </SimpleFormIterator>
          </ArrayInput>
        </div>
        {/* Paint Seed Ranges */}
        <div className="border-t py-3 px-6 border-b">
          <h4 className="text-sm font-medium">Paint Seed Ranges</h4>
          <ArrayInput source="query.paint_seed" label={false}>
            <SimpleFormIterator>
              <PaintSeedRangeInput />
            </SimpleFormIterator>
          </ArrayInput>
        </div>
      </div>
    </div>
  </SimpleForm>
);
