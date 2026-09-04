package domain

import "time"

type TelemetryPayload struct {
	DeviceSN      string  `json:"device_sn"`
	WeightGram    float64 `json:"weight_gram"`
	Tpm           int     `json:"tpm"`
	BloodRawValue int     `json:"blood_raw_value"`
	BatteryPct    int     `json:"battery_pct"`
	SignalDbm     int     `json:"signal_dbm"`
	InternalTemp  float64 `json:"internal_temp"`
	UptimeSeconds int     `json:"uptime_seconds"`
}

type DeviceCacheItem struct {
	Payload       TelemetryPayload
	LastSeen      time.Time
	LastSavedTime time.Time 
	LastSavedTPM  int       
}

// TelemetryDataRequest represents the JSON body sent by the Gateway via HTTP Fallback.
type TelemetryDataRequest struct {
	SessionID 		uint 	`json:"session_id" binding:"required"`
	WeightGram 		float64 `json:"weight_gram"`
	Tpm 			int 	`json:"tpm"`
	BloodRawValue 	int 	`json:"blood_raw_value"`
	BatteryPct 		int 	`json:"battery_pct"`
	SignalDbm 		int 	`json:"signal_dbm"`
	InternalTemp 	float64 `json:"internal_temp"`
	UptimeSeconds 	int 	`json:"uptime_seconds"`
}