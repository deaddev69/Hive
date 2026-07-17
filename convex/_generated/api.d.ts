/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addresses from "../addresses.js";
import type * as adminAuditLogs from "../adminAuditLogs.js";
import type * as adminBoutiques from "../adminBoutiques.js";
import type * as adminClaims from "../adminClaims.js";
import type * as adminCombinedDashboard from "../adminCombinedDashboard.js";
import type * as adminFinance from "../adminFinance.js";
import type * as adminLogistics from "../adminLogistics.js";
import type * as adminMerchants from "../adminMerchants.js";
import type * as adminNotifications from "../adminNotifications.js";
import type * as adminObservability from "../adminObservability.js";
import type * as adminOrders from "../adminOrders.js";
import type * as adminProducts from "../adminProducts.js";
import type * as adminSettings from "../adminSettings.js";
import type * as adminSweep from "../adminSweep.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as banners from "../banners.js";
import type * as boutiques from "../boutiques.js";
import type * as cart from "../cart.js";
import type * as categories from "../categories.js";
import type * as claims from "../claims.js";
import type * as convex__generated_api from "../convex/_generated/api.js";
import type * as convex__generated_server from "../convex/_generated/server.js";
import type * as crons from "../crons.js";
import type * as customerHome from "../customerHome.js";
import type * as debug from "../debug.js";
import type * as emails from "../emails.js";
import type * as fitFeedback from "../fitFeedback.js";
import type * as homepageBanners from "../homepageBanners.js";
import type * as homepageConfig from "../homepageConfig.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as legal from "../legal.js";
import type * as lib_alerts from "../lib/alerts.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_boutiqueCounters from "../lib/boutiqueCounters.js";
import type * as lib_boutiqueStatus from "../lib/boutiqueStatus.js";
import type * as lib_deliveryPricing from "../lib/deliveryPricing.js";
import type * as lib_emailTemplates from "../lib/emailTemplates.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_gating from "../lib/gating.js";
import type * as lib_inventory from "../lib/inventory.js";
import type * as lib_killSwitches from "../lib/killSwitches.js";
import type * as lib_mockInventory from "../lib/mockInventory.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_porter from "../lib/porter.js";
import type * as lib_productStats from "../lib/productStats.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_serviceability from "../lib/serviceability.js";
import type * as lib_uploads from "../lib/uploads.js";
import type * as lib_utils from "../lib/utils.js";
import type * as location from "../location.js";
import type * as locationActions from "../locationActions.js";
import type * as media from "../media.js";
import type * as media_api from "../media/api.js";
import type * as media_cleanup from "../media/cleanup.js";
import type * as media_client from "../media/client.js";
import type * as media_logger from "../media/logger.js";
import type * as media_migration from "../media/migration.js";
import type * as media_stressTest from "../media/stressTest.js";
import type * as media_tests from "../media/tests.js";
import type * as merchantCatalog from "../merchantCatalog.js";
import type * as migrations from "../migrations.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as porter from "../porter.js";
import type * as pricingHelpers from "../pricingHelpers.js";
import type * as products from "../products.js";
import type * as recommendations from "../recommendations.js";
import type * as routing from "../routing.js";
import type * as seed from "../seed.js";
import type * as seedMutations from "../seedMutations.js";
import type * as serviceability from "../serviceability.js";
import type * as serviceablePincodes from "../serviceablePincodes.js";
import type * as shared_boutiqueStatus from "../shared/boutiqueStatus.js";
import type * as tests_authGatingTest from "../tests/authGatingTest.js";
import type * as tests_boutiqueAudit from "../tests/boutiqueAudit.js";
import type * as tests_cartCurrency from "../tests/cartCurrency.js";
import type * as tests_checkTimestamps from "../tests/checkTimestamps.js";
import type * as tests_dataIntegrityAudit from "../tests/dataIntegrityAudit.js";
import type * as tests_debugGatingTest from "../tests/debugGatingTest.js";
import type * as tests_encryptionTest from "../tests/encryptionTest.js";
import type * as tests_financeAudit from "../tests/financeAudit.js";
import type * as tests_hyperlocal from "../tests/hyperlocal.js";
import type * as tests_mediaStressTest from "../tests/mediaStressTest.js";
import type * as tests_merchant from "../tests/merchant.js";
import type * as tests_oversell from "../tests/oversell.js";
import type * as tests_rateLimitGeocode from "../tests/rateLimitGeocode.js";
import type * as tests_retryPayment from "../tests/retryPayment.js";
import type * as tests_retryPaymentSetup from "../tests/retryPaymentSetup.js";
import type * as tests_runCartCurrencyTests from "../tests/runCartCurrencyTests.js";
import type * as tests_runHyperlocalTests from "../tests/runHyperlocalTests.js";
import type * as tests_runMerchantTests from "../tests/runMerchantTests.js";
import type * as tests_runVacationTests from "../tests/runVacationTests.js";
import type * as tests_signatureTest from "../tests/signatureTest.js";
import type * as tests_testPipeline from "../tests/testPipeline.js";
import type * as tests_vacationCapacity from "../tests/vacationCapacity.js";
import type * as tests_verifyLegacyImages from "../tests/verifyLegacyImages.js";
import type * as userLocations from "../userLocations.js";
import type * as users from "../users.js";
import type * as webhooks_clerk from "../webhooks/clerk.js";
import type * as webhooks_logistics from "../webhooks/logistics.js";
import type * as webhooks_porter from "../webhooks/porter.js";
import type * as webhooks_razorpay from "../webhooks/razorpay.js";
import type * as whatsapp from "../whatsapp.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addresses: typeof addresses;
  adminAuditLogs: typeof adminAuditLogs;
  adminBoutiques: typeof adminBoutiques;
  adminClaims: typeof adminClaims;
  adminCombinedDashboard: typeof adminCombinedDashboard;
  adminFinance: typeof adminFinance;
  adminLogistics: typeof adminLogistics;
  adminMerchants: typeof adminMerchants;
  adminNotifications: typeof adminNotifications;
  adminObservability: typeof adminObservability;
  adminOrders: typeof adminOrders;
  adminProducts: typeof adminProducts;
  adminSettings: typeof adminSettings;
  adminSweep: typeof adminSweep;
  analytics: typeof analytics;
  auth: typeof auth;
  banners: typeof banners;
  boutiques: typeof boutiques;
  cart: typeof cart;
  categories: typeof categories;
  claims: typeof claims;
  "convex/_generated/api": typeof convex__generated_api;
  "convex/_generated/server": typeof convex__generated_server;
  crons: typeof crons;
  customerHome: typeof customerHome;
  debug: typeof debug;
  emails: typeof emails;
  fitFeedback: typeof fitFeedback;
  homepageBanners: typeof homepageBanners;
  homepageConfig: typeof homepageConfig;
  http: typeof http;
  invoices: typeof invoices;
  legal: typeof legal;
  "lib/alerts": typeof lib_alerts;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/boutiqueCounters": typeof lib_boutiqueCounters;
  "lib/boutiqueStatus": typeof lib_boutiqueStatus;
  "lib/deliveryPricing": typeof lib_deliveryPricing;
  "lib/emailTemplates": typeof lib_emailTemplates;
  "lib/encryption": typeof lib_encryption;
  "lib/errors": typeof lib_errors;
  "lib/gating": typeof lib_gating;
  "lib/inventory": typeof lib_inventory;
  "lib/killSwitches": typeof lib_killSwitches;
  "lib/mockInventory": typeof lib_mockInventory;
  "lib/money": typeof lib_money;
  "lib/notifications": typeof lib_notifications;
  "lib/porter": typeof lib_porter;
  "lib/productStats": typeof lib_productStats;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/serviceability": typeof lib_serviceability;
  "lib/uploads": typeof lib_uploads;
  "lib/utils": typeof lib_utils;
  location: typeof location;
  locationActions: typeof locationActions;
  media: typeof media;
  "media/api": typeof media_api;
  "media/cleanup": typeof media_cleanup;
  "media/client": typeof media_client;
  "media/logger": typeof media_logger;
  "media/migration": typeof media_migration;
  "media/stressTest": typeof media_stressTest;
  "media/tests": typeof media_tests;
  merchantCatalog: typeof merchantCatalog;
  migrations: typeof migrations;
  orders: typeof orders;
  payments: typeof payments;
  porter: typeof porter;
  pricingHelpers: typeof pricingHelpers;
  products: typeof products;
  recommendations: typeof recommendations;
  routing: typeof routing;
  seed: typeof seed;
  seedMutations: typeof seedMutations;
  serviceability: typeof serviceability;
  serviceablePincodes: typeof serviceablePincodes;
  "shared/boutiqueStatus": typeof shared_boutiqueStatus;
  "tests/authGatingTest": typeof tests_authGatingTest;
  "tests/boutiqueAudit": typeof tests_boutiqueAudit;
  "tests/cartCurrency": typeof tests_cartCurrency;
  "tests/checkTimestamps": typeof tests_checkTimestamps;
  "tests/dataIntegrityAudit": typeof tests_dataIntegrityAudit;
  "tests/debugGatingTest": typeof tests_debugGatingTest;
  "tests/encryptionTest": typeof tests_encryptionTest;
  "tests/financeAudit": typeof tests_financeAudit;
  "tests/hyperlocal": typeof tests_hyperlocal;
  "tests/mediaStressTest": typeof tests_mediaStressTest;
  "tests/merchant": typeof tests_merchant;
  "tests/oversell": typeof tests_oversell;
  "tests/rateLimitGeocode": typeof tests_rateLimitGeocode;
  "tests/retryPayment": typeof tests_retryPayment;
  "tests/retryPaymentSetup": typeof tests_retryPaymentSetup;
  "tests/runCartCurrencyTests": typeof tests_runCartCurrencyTests;
  "tests/runHyperlocalTests": typeof tests_runHyperlocalTests;
  "tests/runMerchantTests": typeof tests_runMerchantTests;
  "tests/runVacationTests": typeof tests_runVacationTests;
  "tests/signatureTest": typeof tests_signatureTest;
  "tests/testPipeline": typeof tests_testPipeline;
  "tests/vacationCapacity": typeof tests_vacationCapacity;
  "tests/verifyLegacyImages": typeof tests_verifyLegacyImages;
  userLocations: typeof userLocations;
  users: typeof users;
  "webhooks/clerk": typeof webhooks_clerk;
  "webhooks/logistics": typeof webhooks_logistics;
  "webhooks/porter": typeof webhooks_porter;
  "webhooks/razorpay": typeof webhooks_razorpay;
  whatsapp: typeof whatsapp;
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
