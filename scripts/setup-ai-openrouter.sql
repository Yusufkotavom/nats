-- Setup AI Settings for OpenRouter + Nvidia Nemotron
INSERT INTO "AISettings" (
  id,
  provider,
  "apiKey",
  model,
  temperature,
  "maxTokens",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  'ai-settings-openrouter',
  'openrouter',
  '${OPENROUTER_API_KEY}',
  'nvidia/nemotron-3-super-120b-a12b:free',
  0.7,
  1000,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  provider = EXCLUDED.provider,
  "apiKey" = EXCLUDED."apiKey",
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  "maxTokens" = EXCLUDED."maxTokens",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();
