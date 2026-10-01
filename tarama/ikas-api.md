# ikas API keşfi (tasarım uygulaması)

Tarih: 2026-10-01T19:40:42.076Z

## Erişim denemesi (salt okunur)

| Sorgu | Sonuç |
|---|---|
| `getMerchant` | izin var |
| `getMerchantLicence` | izin var |
| `getSalesChannel` | hata: error_messages.merchant.app_is_not_a_sales_channel |
| `listMerchantAppPayment` | izin var |
| `listMerchantSettings` | izin var |
| `listSalesChannel` | izin var |
| `listStorefront` | izin var |
| `listStorefrontJSScript` | izin var |
| `listStorefrontPolicy` | izin var |

## İlgili sorgular

| Ad | Argümanlar | Dönen | Açıklama |
|---|---|---|---|
| `getAvailableSubscriptions` | — | `[GetAvailableSubscriptionResponse!]!` | Using this api, you can get available subscriptions for a merchant app. |
| `getMerchant` | — | `MerchantResponse!` | By using this api you can get properties of merchant and merchant staff. |
| `getMerchantLicence` | — | `MerchantLicence!` | Using this api you can view all licenses owned by merchant. |
| `getSalesChannel` | — | `SalesChannel` | Using this api, you can view your sales channel. |
| `listMerchantAppPayment` | id: StringFilterInput, pagination: PaginationInput | `MerchantAppPaymentPaginationResponse!` | Using this api, you can view the payment features that a merchant has created for the app. |
| `listMerchantSettings` | id: StringFilterInput, merchantId: StringFilterInput | `[MerchantSettings!]!` |  |
| `listSalesChannel` | id: StringFilterInput | `[SalesChannel!]!` |  |
| `getGlobalTaxSettings` | — | `GlobalTaxSettings` | Use this mutation to get global settings. |
| `listCampaign` | canCombineWithOtherCampaigns: BooleanFilterInput, dateRangeIsActive: CampaignDateRangeIsActiveFilterInput, hasCoupon: BooleanFilterInput, id: StringFilterInput, includeDeleted: Boolean, pagination: PaginationInput, search: String, sort: String, type: CampaignTypeEnumFilterInput, updatedAt: DateFilterInput | `CampaignPaginationResponse!` | Query to list Campaign Search functionality is available for the following fields: `title`. Example: If search='test', it will match records containing 'test' in any of these fields. |
| `listCoupon` | campaignId: StringFilterInput, id: StringFilterInput, includeDeleted: Boolean, pagination: PaginationInput, search: String | `CouponPaginationResponse!` |  |
| `listGlobalTaxSettings` | id: StringFilterInput, includeDeleted: Boolean, storefrontId: StringFilterInput | `[GlobalTaxSettings!]!` | Query to list GlobalTaxSettings |
| `listShippingSettings` | includeDeleted: Boolean | `[ShippingSettings!]!` |  |
| `listTaxSettings` | countryId: StringFilterInput, id: StringFilterInput, includeDeleted: Boolean | `[TaxSettings!]!` | Query to list TaxSettings |
| `listStorefront` | id: StringFilterInput, salesChannelId: StringFilterInput | `[Storefront!]!` |  |
| `listStorefrontJSScript` | storefrontId: String | `[StorefrontJSScript!]!` | Use this query to list storefront javascript scripts by supplying the `storefrontId` input. |
| `listStorefrontPolicy` | id: StringFilterInput, includeDeleted: Boolean, language: StringFilterInput, name: StringFilterInput, pagination: PaginationInput, search: String, updatedAt: DateFilterInput | `[StorefrontPolicy!]!` | Use this query to list storefront policies by supplying the `StorefrontPolicyArgs` input. Search functionality is available for the following fields: `name`, `slug`. Example: If search='test', it will match records containing 'test' in any of these fields. |

## İlgili değişiklik işlemleri (çalıştırılmadı)

| Ad | Argümanlar | Dönen | Açıklama |
|---|---|---|---|
| `updateSubscriptionStatus` | customerId: String!, subscriptionStatus: CustomerEmailSubscriptionStatusesEnum! | `Boolean!` |  |
| `createMerchantAppPayment` | input: MerchantAppPaymentInput! | `MerchantAppPayment!` | Using this api, you can add payment features to a merchant app. |
| `createMerchantAppPaymentWithSubscription` | input: CreateMerchantAppPaymentWithSubscriptionInput! | `MerchantAppPayment` | Using this api, you can add payment features to a merchant app with app subscription id. |
| `saveSalesChannel` | input: SalesChannelInput! | `SalesChannel` | Using this api you can update the sales channel name, priceList Id and stockLocations properties. |
| `campaignAddCoupons` | input: AddCouponsInput! | `[Coupon!]!` |  |
| `deleteCampaignList` | idList: [String!]! | `Boolean!` | Mutation to delete Campaign |
| `deleteCouponList` | idList: [String!]! | `String!` |  |
| `deleteGlobalTaxSettingsList` | idList: [String!]! | `Boolean!` | Mutation to delete GlobalTaxSettings |
| `deleteTaxSettingsList` | idList: [String!]! | `Boolean!` | Mutation to delete TaxSettings |
| `saveCampaign` | input: CampaignInput! | `Campaign!` | Mutation to save Campaign |
| `saveGlobalTaxSettings` | input: GlobalTaxSettingsInput! | `GlobalTaxSettings!` | Mutation to save GlobalTaxSettings |
| `saveTaxSettings` | input: TaxSettingsInput! | `TaxSettings!` | Mutation to save TaxSettings |
| `updateProductSalesChannelStatus` | input: [UpdateProductSalesChannelStatusInput!]!, salesChannelId: String | `Boolean!` | Response indicating the status of operation. |
| `deleteStorefrontJSScript` | storefrontIdList: [String!]! | `Boolean!` | Using this api, you can delete javascript script from a the storefront. |
| `deleteStorefrontPolicyList` | idList: [String!]! | `Boolean!` | Using this API, you can delete a policy from the storefront. |
| `saveStorefrontJSScript` | input: StorefrontJSScriptInput! | `StorefrontJSScript!` | Using this api, you can save javascript script to a the storefront. |
| `saveStorefrontPolicy` | input: StorefrontPolicyInput! | `StorefrontPolicy!` | Using this API, you can save a policy to the storefront. |
