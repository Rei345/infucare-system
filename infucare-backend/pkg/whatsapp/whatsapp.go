package whatsapp

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// SendWhatsAppAlert triggers a message delivery via the Fonnte API.
func SendWhatsAppAlert(targetNumber string, message string) error {
	baseUrl := "https://api.fonnte.com/send"
	
	token := os.Getenv("FONNTE_TOKEN")
	if token == "" {
		return fmt.Errorf("FONNTE_TOKEN tidak ditemukan di environment variables")
	}

	data := url.Values{}
	data.Set("target", targetNumber) 
	data.Set("message", message) 

	req, err := http.NewRequest("POST", baseUrl, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("gagal membuat HTTP request: %w", err)
	}

	req.Header.Add("Authorization", token)
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("gagal menghubungi server Fonnte: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	responseString := string(bodyBytes)

	if strings.Contains(responseString, `"status":false`) {
		return fmt.Errorf("pesan ditolak Fonnte: %s", responseString)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fonnte HTTP error (Status %d): %s", resp.StatusCode, responseString)
	}

	log.Printf("[WHATSAPP] Sukses mengirim notifikasi ke: %s\n", targetNumber)
	return nil
}