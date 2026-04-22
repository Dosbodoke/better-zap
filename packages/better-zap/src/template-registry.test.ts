import { describe, expect, it } from "vitest";
import {
  defineTemplates,
  serializeTemplateFromRegistry,
} from "./template-registry";

const testTemplates = defineTemplates({
  convite_evento_v1: {
    language: "pt_BR",
    components: [
      {
        type: "header",
        parameters: [{ name: "header_location", type: "location" }],
      },
      {
        type: "body",
        parameters: [
          { name: "body_1", type: "text" },
          { name: "body_2", type: "text" },
        ],
      },
      {
        type: "button",
        subType: "quick_reply",
        index: "1",
        parameters: [{ name: "button_1_payload", type: "payload" }],
      },
    ],
  },
  convite_evento_v3: {
    language: "pt_BR",
    components: [
      {
        type: "body",
        parameters: [
          { name: "body_data", parameterName: "data", type: "text" },
          {
            name: "body_endereco",
            parameterName: "endereco",
            type: "text",
          },
        ],
      },
    ],
  },
  feedback_static_footer: {
    language: "pt_BR",
    components: [
      {
        type: "body",
        parameters: [{ name: "body_1", type: "text" }],
      },
      {
        type: "button",
        subType: "url",
        index: "0",
        parameters: [],
      },
    ],
  },
} as const);

describe("serializeTemplateFromRegistry", () => {
  it("serializes typed params into Meta template components", () => {
    const serialized = serializeTemplateFromRegistry(
      testTemplates,
      "convite_evento_v1",
      {
        params: {
          header_location: {
            latitude: -15.793889,
            longitude: -47.882778,
            name: "Parque da Cidade",
            address: "Estacionamento 11",
          },
          body_1: "Francisca",
          body_2: "21/03",
          button_1_payload: "OPT_OUT",
        },
      },
    );

    expect(serialized).toEqual({
      language: "pt_BR",
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "location",
              location: {
                latitude: -15.793889,
                longitude: -47.882778,
                name: "Parque da Cidade",
                address: "Estacionamento 11",
              },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: "Francisca" },
            { type: "text", text: "21/03" },
          ],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [{ type: "payload", payload: "OPT_OUT" }],
        },
      ],
    });
  });

  it("rejects unexpected template params", () => {
    expect(() =>
      serializeTemplateFromRegistry(testTemplates, "convite_evento_v1", {
        params: {
          header_location: {
            latitude: -15.793889,
            longitude: -47.882778,
            name: "Parque da Cidade",
            address: "Estacionamento 11",
          },
          body_1: "Francisca",
          body_2: "21/03",
          button_1_payload: "OPT_OUT",
          extra: "invalid",
        },
      }),
    ).toThrow('Unexpected template params for "convite_evento_v1": extra');
  });

  it("includes Meta parameter_name for named template variables", () => {
    const serialized = serializeTemplateFromRegistry(
      testTemplates,
      "convite_evento_v3",
      {
        params: {
          body_data: "26/04/2026",
          body_endereco: "Taguaparque",
        },
      },
    );

    expect(serialized.components).toEqual([
      {
        type: "body",
        parameters: [
          {
            type: "text",
            parameter_name: "data",
            text: "26/04/2026",
          },
          {
            type: "text",
            parameter_name: "endereco",
            text: "Taguaparque",
          },
        ],
      },
    ]);
  });

  it("skips components that do not require runtime params", () => {
    const serialized = serializeTemplateFromRegistry(
      testTemplates,
      "feedback_static_footer",
      {
        params: {
          body_1: "Joao",
        },
      },
    );

    expect(serialized.components).toEqual([
      {
        type: "body",
        parameters: [{ type: "text", text: "Joao" }],
      },
    ]);
  });
});
