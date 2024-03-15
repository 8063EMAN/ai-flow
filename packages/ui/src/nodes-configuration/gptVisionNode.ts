import { NodeConfig } from "./nodeConfig";

export const gptVisionNodeConfig: NodeConfig = {
  nodeName: "GPT Vision",
  icon: "FaEye",
  inputNames: ["image_url", "prompt"],
  fields: [
    // {
    //   name: "model",
    //   type: "option",
    //   options: [
    //     {
    //       label: "GPT4-Turbo Vision",
    //       value: "gpt-4-vision-preview",
    //       default: true,
    //     },
    //   ],
    // },
    {
      name: "image_url",
      label: "Image URL",
      type: "input",
      hasHandle: true,
      required: true,
      placeholder: "VisionPromptPlaceholder",
    },
    {
      name: "prompt",
      label: "Prompt",
      type: "textarea",
      required: true,
      hasHandle: true,
      placeholder: "VisionPromptPlaceholder",
    },
  ],
  outputType: "text",
  hasInputHandle: true,
  section: "models",
  helpMessage: "gptVisionPromptHelp",
  showHandlesNames: true,
};
