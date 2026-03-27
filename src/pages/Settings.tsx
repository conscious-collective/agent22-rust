import { useState } from "react";
import { CheckCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useProviders, useSetProviderKey, useModels } from "@/hooks/use-providers";
import { api } from "@/lib/api";

function ProviderRow({ provider }: { provider: import("@/types/provider").Provider }) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const { mutate: setProviderKey, isPending } = useSetProviderKey();

  const handleSave = () => {
    if (!key.trim()) return;
    setProviderKey({ provider: provider.name, key: key.trim() }, {
      onSuccess: () => setKey(""),
    });
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const ok = await api.providers.test(provider.name);
      setTestResult(ok);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{provider.display_name}</p>
          {provider.authenticated ? (
            <Badge variant="success" className="text-[10px]">Authenticated</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">No key</Badge>
          )}
          {testResult === true && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
          {testResult === false && <span className="text-[10px] text-red-500">Failed</span>}
        </div>
        <p className="text-xs text-muted-foreground">{provider.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            placeholder="Enter API key…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-52 h-8 text-xs pr-8"
          />
          <button
            className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowKey((v) => !v)}
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <Button size="sm" variant="outline" className="h-8" onClick={handleSave} disabled={isPending || !key.trim()}>
          Save
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleTest} disabled={testing}>
          <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}

export function Settings() {
  const { data: providers = [], isLoading } = useProviders();
  const { data: models = [] } = useModels();

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <h1 className="text-sm font-semibold">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Providers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">LLM Providers</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure API keys for the AI providers you want to use.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <LoadingSpinner />
            ) : providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No providers found. Make sure the app is running correctly.
              </p>
            ) : (
              providers.map((p) => <ProviderRow key={p.name} provider={p} />)
            )}
          </CardContent>
        </Card>

        {/* Models */}
        {models.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Available Models</CardTitle>
              <p className="text-xs text-muted-foreground">
                {models.length} models available across {new Set(models.map((m) => m.provider)).size} providers.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {models.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground">{m.provider}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.supports_tools && <Badge variant="secondary" className="text-[10px]">Tools</Badge>}
                      {m.supports_vision && <Badge variant="secondary" className="text-[10px]">Vision</Badge>}
                      {m.context_window && (
                        <span className="text-[10px] text-muted-foreground">
                          {(m.context_window / 1000).toFixed(0)}k ctx
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">About</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <p>agent22 v0.1.0 — Local AI workflow automation</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
