package ipfs

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"settlemint-service/internal/core/config"
)

type Client struct {
	apiBaseURL     string
	gatewayBaseURL string
	httpClient     *http.Client
}

type StoredContent struct {
	CID        string
	GatewayURL string
}

func NewClient(cfg config.Config) Client {
	return Client{
		apiBaseURL:     strings.TrimRight(strings.TrimSpace(cfg.IPFSAPIURL), "/"),
		gatewayBaseURL: strings.TrimRight(strings.TrimSpace(cfg.IPFSGatewayURL), "/"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c Client) StoreJSON(ctx context.Context, fileName string, payload any) (StoredContent, error) {
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return StoredContent{}, fmt.Errorf("marshal archive json: %w", err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	fileWriter, err := writer.CreateFormFile("file", sanitizeFileName(fileName))
	if err != nil {
		return StoredContent{}, fmt.Errorf("create ipfs upload form file: %w", err)
	}
	if _, err := fileWriter.Write(rawPayload); err != nil {
		return StoredContent{}, fmt.Errorf("write ipfs upload payload: %w", err)
	}
	if err := writer.Close(); err != nil {
		return StoredContent{}, fmt.Errorf("close ipfs upload form: %w", err)
	}

	addURL := c.apiBaseURL + "/api/v0/add?pin=true&cid-version=1"
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, addURL, &body)
	if err != nil {
		return StoredContent{}, fmt.Errorf("build ipfs add request: %w", err)
	}
	request.Header.Set("Content-Type", writer.FormDataContentType())

	response, err := c.httpClient.Do(request)
	if err != nil {
		return StoredContent{}, fmt.Errorf("call ipfs add endpoint: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return StoredContent{}, fmt.Errorf("ipfs add failed with status %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	var result struct {
		Hash string `json:"Hash"`
	}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return StoredContent{}, fmt.Errorf("decode ipfs add response: %w", err)
	}

	cid := strings.TrimSpace(result.Hash)
	if cid == "" {
		return StoredContent{}, fmt.Errorf("ipfs add response missing cid")
	}

	return StoredContent{
		CID:        cid,
		GatewayURL: buildGatewayURL(c.gatewayBaseURL, cid),
	}, nil
}

func (c Client) GetJSON(ctx context.Context, targetURL string) ([]byte, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimSpace(targetURL), nil)
	if err != nil {
		return nil, fmt.Errorf("build ipfs get request: %w", err)
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("call ipfs get endpoint: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return nil, fmt.Errorf("ipfs get failed with status %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	payload, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("read ipfs get response: %w", err)
	}

	return payload, nil
}

func (c Client) GetJSONByCID(ctx context.Context, cid string) ([]byte, error) {
	targetCID := strings.TrimSpace(cid)
	if targetCID == "" {
		return nil, fmt.Errorf("ipfs cid is required")
	}

	catURL := c.apiBaseURL + "/api/v0/cat?arg=" + url.QueryEscape(targetCID)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, catURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build ipfs cat request: %w", err)
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("call ipfs cat endpoint: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return nil, fmt.Errorf("ipfs cat failed with status %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	payload, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("read ipfs cat response: %w", err)
	}

	return payload, nil
}

func buildGatewayURL(gatewayBaseURL string, cid string) string {
	parsedURL, err := url.Parse(gatewayBaseURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return gatewayBaseURL + "/ipfs/" + cid
	}

	parsedURL.Path = path.Join(parsedURL.Path, "ipfs", cid)
	return parsedURL.String()
}

func sanitizeFileName(fileName string) string {
	normalizedFileName := strings.TrimSpace(fileName)
	if normalizedFileName == "" {
		return "archive.json"
	}
	if !strings.HasSuffix(strings.ToLower(normalizedFileName), ".json") {
		return normalizedFileName + ".json"
	}
	return normalizedFileName
}
