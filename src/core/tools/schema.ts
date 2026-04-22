/** Data type of the schema field. */
export enum Type {
  /**
   * Not specified, should not be used.
   */
  TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
  /**
   * OpenAPI string type
   */
  STRING = 'STRING',
  /**
   * OpenAPI number type
   */
  NUMBER = 'NUMBER',
  /**
   * OpenAPI integer type
   */
  INTEGER = 'INTEGER',
  /**
   * OpenAPI boolean type
   */
  BOOLEAN = 'BOOLEAN',
  /**
   * OpenAPI array type
   */
  ARRAY = 'ARRAY',
  /**
   * OpenAPI object type
   */
  OBJECT = 'OBJECT',
  /**
   * Null type
   */
  NULL = 'NULL',
}

/** Schema is used to define the format of input/output data.

 Represents a select subset of an [OpenAPI 3.0 schema
 object](https://spec.openapis.org/oas/v3.0.3#schema-object). More fields may
 be added in the future as needed. */
export interface Schema {
  /** Optional. The instance must be valid against any (one or more) of the subschemas listed in `any_of`. */
  anyOf?: Schema[];
  /** Optional. Default value to use if the field is not specified. */
  default?: unknown;
  /** Optional. Describes the data. The model uses this field to understand the purpose of the schema and how to use it. It is a best practice to provide a clear and descriptive explanation for the schema and its properties here, rather than in the prompt. */
  description?: string;
  /** Optional. Possible values of the field. This field can be used to restrict a value to a fixed set of values. To mark a field as an enum, set `format` to `enum` and provide the list of possible values in `enum`. For example: 1. To define directions: `{type:STRING, format:enum, enum:["EAST", "NORTH", "SOUTH", "WEST"]}` 2. To define apartment numbers: `{type:INTEGER, format:enum, enum:["101", "201", "301"]}` */
  enum?: string[];
  /** Optional. Example of an instance of this schema. */
  example?: unknown;
  /** Optional. The format of the data. For `NUMBER` type, format can be `float` or `double`. For `INTEGER` type, format can be `int32` or `int64`. For `STRING` type, format can be `email`, `byte`, `date`, `date-time`, `password`, and other formats to further refine the data type. */
  format?: string;
  /** Optional. If type is `ARRAY`, `items` specifies the schema of elements in the array. */
  items?: Schema;
  /** Optional. If type is `ARRAY`, `max_items` specifies the maximum number of items in an array. */
  maxItems?: string;
  /** Optional. If type is `STRING`, `max_length` specifies the maximum length of the string. */
  maxLength?: string;
  /** Optional. If type is `OBJECT`, `max_properties` specifies the maximum number of properties that can be provided. */
  maxProperties?: string;
  /** Optional. If type is `INTEGER` or `NUMBER`, `maximum` specifies the maximum allowed value. */
  maximum?: number;
  /** Optional. If type is `ARRAY`, `min_items` specifies the minimum number of items in an array. */
  minItems?: string;
  /** Optional. If type is `STRING`, `min_length` specifies the minimum length of the string. */
  minLength?: string;
  /** Optional. If type is `OBJECT`, `min_properties` specifies the minimum number of properties that can be provided. */
  minProperties?: string;
  /** Optional. If type is `INTEGER` or `NUMBER`, `minimum` specifies the minimum allowed value. */
  minimum?: number;
  /** Optional. Indicates if the value of this field can be null. */
  nullable?: boolean;
  /** Optional. If type is `STRING`, `pattern` specifies a regular expression that the string must match. */
  pattern?: string;
  /** Optional. If type is `OBJECT`, `properties` is a map of property names to schema definitions for each property of the object. */
  properties?: Record<string, Schema>;
  /** Optional. Order of properties displayed or used where order matters. This is not a standard field in OpenAPI specification, but can be used to control the order of properties. */
  propertyOrdering?: string[];
  /** Optional. If type is `OBJECT`, `required` lists the names of properties that must be present. */
  required?: string[];
  /** Optional. Title for the schema. */
  title?: string;
  /** Optional. Data type of the schema field. */
  type?: Type;
}
