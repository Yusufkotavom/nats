"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { saveAISettings, AISettingsInput } from "../actions";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "openrouter"]),
  apiKey: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(32000),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function AISettingsForm({ initialData }: { initialData: any }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: initialData?.provider || "openai",
      apiKey: initialData?.apiKey || "",
      model: initialData?.model || "gpt-4o-mini",
      temperature: initialData?.temperature ?? 0.7,
      maxTokens: initialData?.maxTokens ?? 1000,
      isActive: initialData?.isActive ?? true,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await saveAISettings(data);
      if (result.success) {
        toast({ title: "Settings saved" });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Provider Settings</CardTitle>
          <CardDescription>Configure the AI provider and API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Enable AI Assistant</Label>
              <div className="text-sm text-muted-foreground">
                Turn on/off the AI features globally.
              </div>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Provider</Label>
            <Controller
              control={control}
              name="provider"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google Gemini</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.provider && <p className="text-sm text-red-500">{errors.provider.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="sk-..."
              {...register("apiKey")}
            />
            <p className="text-sm text-muted-foreground">
              Leave blank to use the environment variable default.
            </p>
            {errors.apiKey && <p className="text-sm text-red-500">{errors.apiKey.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              placeholder="gpt-4o-mini"
              {...register("model")}
            />
            <p className="text-sm text-muted-foreground">
              e.g., gpt-4o, claude-3-5-sonnet-20240620
            </p>
            {errors.model && <p className="text-sm text-red-500">{errors.model.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Parameters</CardTitle>
          <CardDescription>Fine-tune the model behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              {...register("temperature", { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              Controls randomness: 0 is deterministic, 1 is creative.
            </p>
            {errors.temperature && <p className="text-sm text-red-500">{errors.temperature.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input
              type="number"
              {...register("maxTokens", { valueAsNumber: true })}
            />
            {errors.maxTokens && <p className="text-sm text-red-500">{errors.maxTokens.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Configuration
      </Button>
    </form>
  );
}
