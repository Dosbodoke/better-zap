/** Configuration for {@link WhatsAppService}. */
export interface WhatsAppConfig {
  /** System User access token for the WhatsApp Cloud API. */
  token: string;
  /** Phone number ID registered in Meta Business Manager. */
  phoneId: string;
  /** Set to `"development"` to skip real API calls and return mock responses. */
  environment?: string;
}
