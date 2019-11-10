import {SecuritySchemeObject, ReferenceObject} from 'openapi3-ts';

export const OPERATION_SECURITY_SPEC = [{bearerAuth: []}];

export type SecuritySchemeObjects = {
  [securtiyScheme: string]: SecuritySchemeObject | ReferenceObject;
};

export const SECURITY_SCHEME_SPEC: SecuritySchemeObjects = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
};
