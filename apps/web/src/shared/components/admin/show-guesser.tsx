import { ArrayField } from "@/shared/components/admin/array-field";
import { BadgeField } from "@/shared/components/admin/badge-field";
import { NumberField } from "@/shared/components/admin/number-field";
import { RecordField } from "@/shared/components/admin/record-field";
import { ReferenceArrayField } from "@/shared/components/admin/reference-array-field";
import { ReferenceField } from "@/shared/components/admin/reference-field";
import { ShowView } from "@/shared/components/admin/show";
import { SingleFieldList } from "@/shared/components/admin/single-field-list";
import { capitalize, singularize } from "inflection";
import {
  InferredElement,
  type InferredTypeMap,
  ShowBase,
  getElementsFromRecords,
  useResourceContext,
  useShowContext,
} from "ra-core";
import { Children, type ReactNode, isValidElement, useEffect, useState } from "react";
import { DateField } from "./date-field";

export const ShowGuesser = (props: { enableLog?: boolean }) => (
  <ShowBase>
    <ShowViewGuesser {...props} />
  </ShowBase>
);

const ShowViewGuesser = (props: { enableLog?: boolean }) => {
  const resource = useResourceContext();

  if (!resource) {
    throw new Error("Cannot use <ShowGuesser> outside of a ResourceContext");
  }

  const { record } = useShowContext();
  const [child, setChild] = useState<ReactNode>(null);
  const { enableLog = import.meta.env.DEV, ...rest } = props;

  useEffect(() => {
    setChild(null);
  }, [resource]);

  useEffect(() => {
    if (record && !child) {
      const inferredElements = getElementsFromRecords([record], showFieldTypes);
      const inferredChild = new InferredElement(showFieldTypes.show, null, inferredElements);
      setChild(inferredChild.getElement());

      if (!enableLog) return;

      const representation = inferredChild.getRepresentation();
      const components = ["Show"]
        .concat(
          Array.from(
            new Set(
              Array.from(representation.matchAll(/<([^/\s>]+)/g))
                .map((match) => match[1])
                .filter((component) => component !== "span" && component !== "div"),
            ),
          ),
        )
        .sort();

      // eslint-disable-next-line no-console
      console.log(
        `Guessed Show:

${components
  .map((component) => `import { ${component} } from "@/shared/components/admin/${kebabCase(component)}";`)
  .join("\n")}

export const ${capitalize(singularize(resource))}Show = () => (
    <Show>
${inferredChild.getRepresentation()}
    </Show>
);`,
      );
    }
  }, [record, child, resource, enableLog]);

  return <ShowView {...rest}>{child}</ShowView>;
};

const showFieldTypes: InferredTypeMap = {
  show: {
    component: (props: any) => <div className="flex flex-col gap-4">{props.children}</div>,
    representation: (
      _props: any,
      children: { getRepresentation: () => string }[],
    ) => `        <div className="flex flex-col gap-4">
${children.map((child) => `            ${child.getRepresentation()}`).join("\n")}
        </div>`,
  },
  reference: {
    component: (props: any) => (
      <RecordField source={props.source}>
        <ReferenceField source={props.source} reference={props.reference} />
      </RecordField>
    ),
    representation: (props: any) =>
      `<RecordField source="${props.source}">
                <ReferenceField source="${props.source}" reference="${props.reference}" />
            </RecordField>`,
  },
  array: {
    component: ({ children, ...props }: any) => {
      const childrenArray = Children.toArray(children);
      return (
        <RecordField source={props.source}>
          <ArrayField source={props.source}>
            <SingleFieldList>
              <BadgeField
                source={
                  childrenArray.length > 0 && isValidElement(childrenArray[0]) && (childrenArray[0].props as any).source
                }
              />
            </SingleFieldList>
          </ArrayField>
        </RecordField>
      );
    },
    representation: (props: any, children: any) =>
      `<RecordField source="${props.source}">
                <ArrayField source="${props.source}">
                    <SingleFieldList>
                        <BadgeField source="${children.length > 0 && children[0].getProps().source}" />
                    </SingleFieldList>
                </ArrayField>
            </RecordField>`,
  },
  referenceArray: {
    component: (props: any) => (
      <RecordField source={props.source}>
        <ReferenceArrayField {...props} />
      </RecordField>
    ),
    representation: (props: any) =>
      `<RecordField source="${props.source}">
                <ReferenceArrayField source="${props.source}" reference="${props.reference}" />
            </RecordField>`,
  },
  boolean: {
    component: (props: any) => (
      <RecordField source={props.source} render={(record) => (record[props.source] ? "Yes" : "No")} />
    ),
    representation: (props: any) =>
      `<RecordField source="${props.source}" render={record => record[${props.source}] ? 'Yes' : 'No'} />`,
  },
  date: {
    component: (props: any) => (
      <RecordField source={props.source}>
        <DateField source={props.source} />
      </RecordField>
    ),
    representation: (props: any) =>
      `<RecordField source="${props.source}">
                <DateField source="${props.source}" />
            </RecordField>`,
  },
  number: {
    component: (props: any) => (
      <RecordField source={props.source}>
        <NumberField source={props.source} />
      </RecordField>
    ),
    representation: (props: any) =>
      `<RecordField source="${props.source}">
                <NumberField source="${props.source}" />
            </RecordField>`,
  },
  string: {
    component: (props: any) => <RecordField source={props.source} />,
    representation: (props: any) => `<RecordField source="${props.source}" />`,
  },
};

const kebabCase = (name: string) => {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
};
