/** Configuration for {@link WhatsAppService}. */
export interface WhatsAppConfig {
  /** System User access token for the WhatsApp Cloud API. */
  token: string;
  /** Phone number ID registered in Meta Business Manager. */
  phoneId: string;
  /** Set to `"development"` to skip real API calls and return mock responses. */
  environment?: string;
  /**
   * How to treat a number written without a country code. Defaults to `"BR"`.
   * Set to `false` when you message numbers outside Brazil.
   * See `NormalizePhoneOptions.defaultCountry`.
   */
  defaultCountry?: "BR" | false;
}
