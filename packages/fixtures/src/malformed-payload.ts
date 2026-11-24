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

export const malformedPayloadEmptyEntryFixture: unknown = {
  object: "whatsapp_business_account",
  entry: [],
};

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

export const malformedPayloadMissingObjectFixture: unknown = {
  entry: [
    {
      id: "waba_fixture_1",
      changes: [],
    },
  ],
};
