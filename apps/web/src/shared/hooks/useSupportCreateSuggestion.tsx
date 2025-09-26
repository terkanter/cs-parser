import type * as React from "react";
import {
  type ChangeEvent,
  createContext,
  isValidElement,
  type ReactElement,
  useContext,
  useRef,
  useState,
} from "react";
import { type Identifier, type OptionText, useTranslate } from "ra-core";
import set from "lodash/set";

/**
 * This hook provides support for suggestion creation in inputs which have choices.
 *
 * @deprecated Use `useSupportCreateSuggestion` from "ra-core" when available.
 *
 * @param options The hook option
 * @param {ReactElement} options.create A react element which will be rendered when users choose to create a new choice. This component must call the `useCreateSuggestionContext` hook which provides `onCancel`, `onCreate` and `filter`. See the examples.
 * @param {React.ReactNode|string} options.createLabel Optional. The label for the choice item allowing users to create a new choice. Can be a translation key. Defaults to `ra.action.create`.
 * @param {React.ReactNode|string} options.createItemLabel Optional. The label for the choice item allowing users to create a new choice when they already entered a filter. Can be a translation key. The function and ttranslation will receive an `item` parameter. Providing this option will turn the create label when there is no filter to be a hint (i.e. a disabled item).
 * @param {any} options.createValue Optional. The value for the choice item allowing users to create a new choice. Defaults to `@@ra-create`.
 * @param {any} options.createHintValue Optional. The value for the (disabled) item hinting users on how to create a new choice. Defaults to `@@ra-create-hint`.
 * @param {String} options.filter Optional. The filter users may have already entered. Useful for autocomplete inputs for example.
 * @param {OnCreateHandler} options.onCreate Optional. A function which will be called when users choose to create a new choice, if the `create` option wasn't provided.
 * @param {Function} options.handleChange A function to pass to the input. Receives the same parameter as the original event handler and an additional newItem parameter if a new item was create.
 *
 * @returns {UseSupportCreateValue} An object with the following properties:
 * - getCreateItem: a function which will return the label of the choice for create a new choice.
 * - handleChange: a function which should be called when the input value changes. It will call the `onCreate` function if the value is the createValue.
 * - createElement: a React element to render after the input. It will be rendered when users choose to create a new choice. It renders null otherwise.
 * - getOptionDisabled: a function which should be passed to the input to disable the create choice when the filter is empty (to make it a hint).
 */
export const useSupportCreateSuggestion = <T = unknown>(
  options: SupportCreateSuggestionOptions<T>,
): UseSupportCreateValue<T> => {
  const {
    create,
    createLabel = "ra.action.create",
    createItemLabel,
    createValue = "@@ra-create",
    createHintValue = "@@ra-create-hint",
    optionText = "name",
    filter,
    handleChange,
    onCreate,
  } = options;

  const translate = useTranslate();
  const [renderOnCreate, setRenderOnCreate] = useState(false);
  const filterRef = useRef(filter);

  return {
    createId: createValue,
    createHintId: createHintValue,
    getCreateItem: (filter?: string) => {
      filterRef.current = filter;

      return set(
        {
          id: createItemLabel && !filter ? createHintValue : createValue,
        },
        typeof optionText === "string" ? optionText : "name",
        filter && createItemLabel
          ? typeof createItemLabel === "string"
            ? translate(createItemLabel, {
                item: filter,
                _: createItemLabel,
              })
            : createItemLabel(filter)
          : typeof createLabel === "string"
            ? translate(createLabel, { _: createLabel })
            : createLabel,
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleChange: async (eventOrValue: MouseEvent | any) => {
      const value = eventOrValue?.target?.value || eventOrValue;
      const finalValue = Array.isArray(value) ? [...value].pop() : value;

      if (finalValue?.id === createValue || finalValue === createValue) {
        if (!isValidElement(create)) {
          if (!onCreate) {
            // this should never happen because the createValue is only added if a create function is provided
            // @see AutocompleteInput:filterOptions
            throw new Error("To create a new option, you must pass an onCreate function or a create element.");
          }
          const newSuggestion = await onCreate(filter);
          if (newSuggestion) {
            handleChange(newSuggestion);
            return;
          }
        } else {
          setRenderOnCreate(true);
          return;
        }
      }
      handleChange(eventOrValue);
    },
    createElement:
      renderOnCreate && isValidElement(create) ? (
        <CreateSuggestionContext.Provider
          value={{
            filter: filterRef.current,
            onCancel: () => setRenderOnCreate(false),
            onCreate: (item) => {
              setRenderOnCreate(false);
              handleChange(item as T);
            },
          }}
        >
          {create}
        </CreateSuggestionContext.Provider>
      ) : null,
    getOptionDisabled: (option) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (option as any)?.id === createHintValue || option === createHintValue,
  };
};

/**
 * @deprecated Use `SupportCreateSuggestionOptions` from "ra-core" when available.
 */
export interface SupportCreateSuggestionOptions<T = unknown> {
  create?: ReactElement;
  createValue?: string;
  createHintValue?: string;
  createLabel?: React.ReactNode;
  createItemLabel?: string | ((filter: string) => React.ReactNode);
  filter?: string;
  handleChange: (value: T) => void;
  onCreate?: OnCreateHandler;
  optionText?: OptionText;
}

/**
 * @deprecated Use `UseSupportCreateValue` from "ra-core" when available.
 */
export interface UseSupportCreateValue<T = unknown> {
  createId: string;
  createHintId: string;
  getCreateItem: (filterValue?: string) => {
    id: Identifier;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  handleChange: (eventOrValue: ChangeEvent | T) => Promise<void>;
  createElement: ReactElement | null;
  getOptionDisabled: (option: T) => boolean;
}

/**
 * @deprecated Use `CreateSuggestionContext` from "ra-core" when available.
 */
const CreateSuggestionContext = createContext<CreateSuggestionContextValue | undefined>(undefined);

/**
 * @deprecated Use `CreateSuggestionContextValue` from "ra-core" when available.
 */
interface CreateSuggestionContextValue<T = unknown> {
  filter?: string;
  onCreate: (choice: T) => void;
  onCancel: () => void;
}

/**
 * @deprecated Use `useCreateSuggestionContext` from "ra-core" when available.
 */
export const useCreateSuggestionContext = () => {
  const context = useContext(CreateSuggestionContext);
  if (!context) {
    throw new Error("useCreateSuggestionContext must be used inside a CreateSuggestionContext.Provider");
  }
  return context;
};

/**
 * @deprecated Use `OnCreateHandler` from "ra-core" when available.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnCreateHandler = (filter?: string) => any | Promise<any>;
