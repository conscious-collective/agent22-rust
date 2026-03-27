export interface Provider {
  name: string;
  display_name: string;
  authenticated: boolean;
  base_url?: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  context_window?: number;
  supports_tools: boolean;
  supports_vision: boolean;
  supports_streaming: boolean;
  tier?: string;
}
