package server

import (
	"encoding/json"
	"errors"
	"net/http"
)

var ErrInvalidJSON = errors.New("invalid json body")

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{
		"error": message,
	})
}

func DecodeJSON(r *http.Request, dest any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dest); err != nil {
		return ErrInvalidJSON
	}

	return nil
}
