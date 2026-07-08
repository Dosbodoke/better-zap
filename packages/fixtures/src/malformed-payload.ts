// Encodes the Meta ES v4 coexistence webhook spec (webhook field catalog) error category: valid JSON that webhook consumers must reject or quarantine without crashing.
export const malformedPayloadMissingPhoneNumberIdFixture: unknown = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "smb_message_echoes",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
            },
            messages: [
              {
                id: "wamid.echo.malformed.missing-phone.1",
                from: "15550000001",
                timestamp: "1783000500",
                type: "text",
                text: { body: "Missing phone_number_id." },
              },
            ],
          },
        },
      ],
    },
  ],
};

// Encodes the Meta ES v4 coexistence webhook spec (webhook field catalog) error category: an empty entry array is structurally invalid for routing.
export const malformedPayloadEmptyEntryFixture: unknown = {
  object: "whatsapp_business_account",
  entry: [],
};

// Encodes the Meta ES v4 coexistence webhook spec (webhook field catalog) error category: a valid WhatsApp-shaped envelope with an unsupported change field.
export const malformedPayloadUnknownFieldFixture: unknown = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba_fixture_1",
      changes: [
        {
          field: "coexistence_fixture_unknown_field",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15550000001",
              phone_number_id: "phone_known",
            },
          },
        },
      ],
    },
  ],
};

// Encodes the Meta ES v4 coexistence webhook spec (webhook field catalog) error category: JSON that is not a WhatsApp webhook envelope at all.
export const malformedPayloadMissingObjectFixture: unknown = {
  entry: [
    {
      id: "waba_fixture_1",
      changes: [],
    },
  ],
};
