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
	apiURL     string
	gatewayURL string
	httpClient *http.Client
}

type addResponse struct {
	Name string `json:"Name"`
	Hash string `json:"Hash"`
	Size string `json:"Size"`
}

func NewClient(cfg config.Config) *Client {
	return &Client{
		apiURL:     strings.TrimRight(strings.TrimSpace(cfg.IPFSAPIURL), "/"),
		gatewayURL: strings.TrimRight(strings.TrimSpace(cfg.IPFSGatewayURL), "/"),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) AddJSON(ctx context.Context, fileName string, payload []byte) (string, error) {
	if c == nil {
		return "", fmt.Errorf("ipfs client is not configured")
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("file", sanitizeFileName(fileName))
	if err != nil {
		return "", fmt.Errorf("create ipfs multipart file: %w", err)
	}
	if _, err := part.Write(payload); err != nil {
		return "", fmt.Errorf("write ipfs multipart payload: %w", err)
	}
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("close ipfs multipart payload: %w", err)
	}

	requestURL := c.apiURL + "/api/v0/add?pin=true&cid-version=1&raw-leaves=false"
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL, &body)
	if err != nil {
		return "", fmt.Errorf("build ipfs add request: %w", err)
	}
	request.Header.Set("Content-Type", writer.FormDataContentType())

	response, err := c.httpClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("upload archive to ipfs: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return "", fmt.Errorf("upload archive to ipfs: status %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	var result addResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("decode ipfs add response: %w", err)
	}
	if strings.TrimSpace(result.Hash) == "" {
		return "", fmt.Errorf("ipfs add response did not include a cid")
	}

	return strings.TrimSpace(result.Hash), nil
}

func (c *Client) FetchJSON(ctx context.Context, cid string) ([]byte, error) {
	if c == nil {
		return nil, fmt.Errorf("ipfs client is not configured")
	}

	normalizedCID := strings.TrimSpace(cid)
	if normalizedCID == "" {
		return nil, fmt.Errorf("ipfs cid is required")
	}

	requestURL := c.apiURL + "/api/v0/cat?arg=" + url.QueryEscape(normalizedCID)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build ipfs fetch request: %w", err)
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("fetch archive from ipfs: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return nil, fmt.Errorf("fetch archive from ipfs: status %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	payload, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("read ipfs response: %w", err)
	}

	return payload, nil
}

func (c *Client) GatewayURL(cid string) string {
	normalizedCID := strings.TrimSpace(cid)
	if normalizedCID == "" {
		return c.gatewayURL + "/ipfs/"
	}

	gatewayURL, err := url.Parse(c.gatewayURL)
	if err != nil {
		return c.gatewayURL + "/ipfs/" + normalizedCID
	}

	gatewayURL.Path = path.Join(gatewayURL.Path, "ipfs", normalizedCID)
	return gatewayURL.String()
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
