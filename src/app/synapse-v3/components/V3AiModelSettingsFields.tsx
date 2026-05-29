import type { CSSProperties } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  V3_AI_DEFAULT_MODELS,
  V3_AI_PROVIDER_LABELS,
  writeV3AiApiKey,
  writeV3AiSettings,
  useV3AiSettings,
  type V3AiProvider,
} from "../v3AiSettings";
import { useV3AiModelOptions } from "../useV3AiModelOptions";
import { V3SettingRow } from "./v3SettingsUi";

const controlBtnStyle: CSSProperties = {
  background: "var(--v3-settings-control-bg, #373737)",
  borderColor: "var(--v3-settings-control-border, #3d3d3c)",
  color: "var(--v3-settings-control-text, #ffffff)",
  fontFamily: "Inter, sans-serif",
};

export function V3AiModelSettingsFields() {
  const aiSettings = useV3AiSettings();
  const apiKey = aiSettings.apiKeys[aiSettings.provider] ?? "";
  const { options, loading, error, refresh } = useV3AiModelOptions(
    aiSettings.provider,
    apiKey,
    aiSettings.model,
  );

  return (
    <>
      <V3SettingRow
        label="AI provider"
        description="Which LLM provider to use for the assistant sidebar."
        control={
          <select
            value={aiSettings.provider}
            onChange={(e) => {
              const provider = e.target.value as V3AiProvider;
              writeV3AiSettings({
                provider,
                model: V3_AI_DEFAULT_MODELS[provider],
                customModel: "",
              });
            }}
            className="rounded-[3px] border border-solid px-2 py-1 outline-none"
            style={{
              ...controlBtnStyle,
              minWidth: 140,
              height: 30,
              fontSize: 13,
            }}
          >
            {(Object.keys(V3_AI_PROVIDER_LABELS) as V3AiProvider[]).map((id) => (
              <option key={id} value={id}>
                {V3_AI_PROVIDER_LABELS[id]}
              </option>
            ))}
          </select>
        }
      />

      <V3SettingRow
        label="API key"
        description={`API key for ${V3_AI_PROVIDER_LABELS[aiSettings.provider]}. Stored locally on this device.`}
        control={
          <input
            type="password"
            value={apiKey}
            placeholder="sk-…"
            autoComplete="off"
            onChange={(e) => writeV3AiApiKey(aiSettings.provider, e.target.value)}
            className="rounded-[3px] border border-solid px-2 py-1 outline-none"
            style={{
              ...controlBtnStyle,
              width: 180,
              height: 30,
              fontSize: 13,
            }}
          />
        }
      />

      <V3SettingRow
        label="Model"
        description={
          !apiKey.trim()
            ? "Add an API key to load models your account supports."
            : error
              ? error
              : loading
                ? "Loading models from the provider API…"
                : "Model sent to the provider API."
        }
        control={
          <div className="flex flex-col items-end gap-1">
            <Select
              value={options.some((o) => o.id === aiSettings.model) ? aiSettings.model : undefined}
              disabled={loading || options.length === 0}
              onValueChange={(value) => writeV3AiSettings({ model: value })}
            >
              <SelectTrigger
                className="rounded-[3px] border border-solid px-2 py-1 outline-none disabled:opacity-60 min-w-[180px] max-w-[220px] h-[30px] text-[13px] shadow-none"
                style={controlBtnStyle}
              >
                <SelectValue placeholder={loading ? "Loading models…" : "Select model"} />
              </SelectTrigger>
              <SelectContent
                className="z-[10000] border border-solid shadow-lg"
                style={{
                  background: "var(--v3-settings-control-bg, #373737)",
                  borderColor: "var(--v3-settings-control-border, #3d3d3c)",
                  color: "var(--v3-settings-control-text, #ffffff)",
                }}
                position="popper"
              >
                {options.map((opt) => (
                  <SelectItem
                    key={opt.id}
                    value={opt.id}
                    title={opt.label}
                    className="text-[13px] cursor-pointer focus:bg-[#404040] focus:text-white data-[highlighted]:bg-[#404040] data-[highlighted]:text-white"
                  >
                    <span className="truncate block max-w-[280px]">{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {apiKey.trim() ? (
              <button
                type="button"
                className="hover:opacity-80 transition-opacity"
                style={{
                  fontSize: 11,
                  fontFamily: "Inter, sans-serif",
                  color: "var(--v3-settings-desc, #6b6b6b)",
                }}
                onClick={refresh}
              >
                Refresh
              </button>
            ) : null}
          </div>
        }
      />

      <V3SettingRow
        label="Custom model ID"
        description="Overrides the dropdown when set. Use for models not listed."
        control={
          <input
            type="text"
            value={aiSettings.customModel ?? ""}
            placeholder="minimax-m2"
            onChange={(e) => writeV3AiSettings({ customModel: e.target.value })}
            className="rounded-[3px] border border-solid px-2 py-1 outline-none"
            style={{
              ...controlBtnStyle,
              width: 180,
              height: 30,
              fontSize: 13,
            }}
          />
        }
      />
    </>
  );
}
