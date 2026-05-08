package provider

import (
	"testing"

	"github.com/opencode-ai/opencode/internal/llm/models"
)

func TestProviderBaseURLOverrideForOpenAICompatibleProviders(t *testing.T) {
	const proxyBaseURL = "https://proxy.example.com/openrouter/v1"

	provider, err := NewProvider(
		models.ProviderOpenRouter,
		WithAPIKey("test-key"),
		WithBaseURL(proxyBaseURL),
		WithModel(models.Model{}),
	)
	if err != nil {
		t.Fatalf("NewProvider returned error: %v", err)
	}

	client := openAIClientFromProvider(t, provider)
	if client.options.baseURL != proxyBaseURL {
		t.Fatalf("expected proxy base URL %q, got %q", proxyBaseURL, client.options.baseURL)
	}
}

func TestProviderDefaultBaseURLForOpenAICompatibleProviders(t *testing.T) {
	provider, err := NewProvider(
		models.ProviderOpenRouter,
		WithAPIKey("test-key"),
		WithModel(models.Model{}),
	)
	if err != nil {
		t.Fatalf("NewProvider returned error: %v", err)
	}

	client := openAIClientFromProvider(t, provider)
	if client.options.baseURL != "https://openrouter.ai/api/v1" {
		t.Fatalf("expected default OpenRouter base URL, got %q", client.options.baseURL)
	}
}

func TestProviderBaseURLOverrideForCopilot(t *testing.T) {
	const proxyBaseURL = "https://proxy.example.com/copilot"

	provider, err := NewProvider(
		models.ProviderCopilot,
		WithAPIKey("test-key"),
		WithBaseURL(proxyBaseURL),
		WithModel(models.Model{}),
		WithCopilotOptions(WithCopilotBearerToken("test-token")),
	)
	if err != nil {
		t.Fatalf("NewProvider returned error: %v", err)
	}

	baseProvider, ok := provider.(*baseProvider[CopilotClient])
	if !ok {
		t.Fatalf("expected Copilot baseProvider, got %T", provider)
	}
	client, ok := baseProvider.client.(*copilotClient)
	if !ok {
		t.Fatalf("expected copilotClient, got %T", baseProvider.client)
	}
	if client.providerOptions.baseURL != proxyBaseURL {
		t.Fatalf("expected proxy base URL %q, got %q", proxyBaseURL, client.providerOptions.baseURL)
	}
}

func openAIClientFromProvider(t *testing.T, provider Provider) *openaiClient {
	t.Helper()

	baseProvider, ok := provider.(*baseProvider[OpenAIClient])
	if !ok {
		t.Fatalf("expected OpenAI baseProvider, got %T", provider)
	}
	client, ok := baseProvider.client.(*openaiClient)
	if !ok {
		t.Fatalf("expected openaiClient, got %T", baseProvider.client)
	}
	return client
}
