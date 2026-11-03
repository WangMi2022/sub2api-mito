package service

import (
	"context"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestOpenAIProviderRoutingTransientError(t *testing.T) {
	const message = `Model call failed: invalid request (400) ({"provider_name":null})`
	body := []byte(`{"error":{"code":"400","message":"Model call failed: invalid request (400) ({\"provider_name\":null})","type":"upstream_error"}}`)

	require.True(t, isOpenAIProviderRoutingTransientError(http.StatusBadRequest, message, body))
	require.True(t, isOpenAIProviderRoutingTransientError(http.StatusBadRequest, `Model call failed: invalid request (400) ({"provider_name": null})`, nil))
	require.True(t, isOpenAITransientProcessingError(http.StatusBadRequest, message, body))

	svc := &OpenAIGatewayService{}
	require.True(t, svc.shouldFailoverOpenAIUpstreamResponse(
		newOpenAIUpstreamErrorTestAccount(), http.StatusBadRequest, message, body,
	))

	failoverErr := newOpenAIUpstreamFailoverError(http.StatusBadRequest, http.Header{}, body, message, false)
	require.True(t, failoverErr.RetryableOnSameAccount)
	require.True(t, failoverErr.RequestScopedTransient)
	require.False(t, failoverErr.IsOpenAICapacityShed())

	// A provider-side routing failure must not be recorded as an account fault.
	require.False(t, (&OpenAIGatewayService{}).handleOpenAIAccountUpstreamError(
		context.Background(), newOpenAIUpstreamErrorTestAccount(), http.StatusBadRequest, http.Header{}, body,
	))

	require.False(t, isOpenAIProviderRoutingTransientError(
		http.StatusBadRequest,
		"Invalid value for temperature",
		[]byte(`{"error":{"message":"Invalid value for temperature"}}`),
	))
	require.False(t, isOpenAIProviderRoutingTransientError(http.StatusInternalServerError, message, body))
}
