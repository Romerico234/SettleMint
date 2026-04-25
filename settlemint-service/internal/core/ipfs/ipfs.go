package ipfs

import "strings"

func PendingArchiveCID(archiveID string) string {
	normalizedArchiveID := strings.TrimSpace(archiveID)
	if normalizedArchiveID == "" {
		normalizedArchiveID = "pending"
	}

	return "pending-ipfs-" + normalizedArchiveID
}
