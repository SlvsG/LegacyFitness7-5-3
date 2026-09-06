/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as clients from "../clients.js";
import type * as coaches from "../coaches.js";
import type * as email from "../email.js";
import type * as files from "../files.js";
import type * as gallery from "../gallery.js";
import type * as horarios from "../horarios.js";
import type * as http from "../http.js";
import type * as oauth from "../oauth.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as scheduleWods from "../scheduleWods.js";
import type * as wods from "../wods.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  clients: typeof clients;
  coaches: typeof coaches;
  email: typeof email;
  files: typeof files;
  gallery: typeof gallery;
  horarios: typeof horarios;
  http: typeof http;
  oauth: typeof oauth;
  payments: typeof payments;
  products: typeof products;
  scheduleWods: typeof scheduleWods;
  wods: typeof wods;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
