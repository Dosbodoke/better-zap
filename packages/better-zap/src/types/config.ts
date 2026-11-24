export interface WhatsAppConfig {
  token: string;
  phoneId: string;
  environment?: string;
  defaultCountry?: "BR" | false;
  defaultTemplateLanguage?: string;
}
