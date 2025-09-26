import {
  ArrayInput,
  BooleanInput,
  NumberInput,
  SelectInput,
  SimpleForm,
  SimpleFormIterator,
  TextInput,
} from "@/shared/components/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { maxValue, minValue, required } from "ra-core";

const platformChoices = [
  { id: "LIS_SKINS", name: "Lis Skins" },
  { id: "CS_MONEY", name: "CS Money" },
];

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
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SelectInput source="platform" choices={platformChoices} validate={[required()]} label="Platform" />
          <BooleanInput source="isActive" label="Active" defaultValue={true} />
        </CardContent>
      </Card>

      {/* Query Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Search Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Items */}
          <div>
            <h4 className="text-sm font-medium mb-2">Items</h4>
            <ArrayInput source="query.item" label="">
              <SimpleFormIterator>
                <TextInput source="" label="Item name" helperText="e.g., AK-47, AWP, etc." />
              </SimpleFormIterator>
            </ArrayInput>
          </div>

          {/* Quality */}
          <div>
            <h4 className="text-sm font-medium mb-2">Quality</h4>
            <ArrayInput source="query.quality" label="">
              <SimpleFormIterator>
                <SelectInput source="" choices={qualityChoices} label="Quality" />
              </SimpleFormIterator>
            </ArrayInput>
          </div>

          {/* Price Ranges */}
          <div>
            <h4 className="text-sm font-medium mb-2">Price Ranges</h4>
            <ArrayInput source="query.price" label="">
              <SimpleFormIterator>
                <PriceRangeInput />
              </SimpleFormIterator>
            </ArrayInput>
          </div>

          {/* Float Ranges */}
          <div>
            <h4 className="text-sm font-medium mb-2">Float Ranges</h4>
            <ArrayInput source="query.float" label="">
              <SimpleFormIterator>
                <FloatRangeInput />
              </SimpleFormIterator>
            </ArrayInput>
          </div>

          {/* Paint Seed Ranges */}
          <div>
            <h4 className="text-sm font-medium mb-2">Paint Seed Ranges</h4>
            <ArrayInput source="query.paint_seed" label="">
              <SimpleFormIterator>
                <PaintSeedRangeInput />
              </SimpleFormIterator>
            </ArrayInput>
          </div>
        </CardContent>
      </Card>
    </div>
  </SimpleForm>
);
