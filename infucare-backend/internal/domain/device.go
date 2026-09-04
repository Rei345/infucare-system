package domain

type ActivateDeviceRequest struct {
	SN			string `json:"sn" binding:"required"`
	SecretKey 	string `json:"secret_key" binding:"required"`
	AliasName 	string `json:"alias_name"`
}

type UpdateSettingsRequest struct {
	AliasName		string 	`json:"alias_name"`
	SpeakerVolume 	int 	`json:"speaker_volume"`
	AutoStopBlood 	bool 	`json:"auto_stop_blood"`
	AutoStopEmpty 	bool 	`json:"auto_stop_empty"`
}

type TelemetrySnapshot struct {
	BatteryPct 		int 	`json:"battery_pct"`
	SignalDbm 		int 	`json:"signal_dbm"`
	InternalTemp 	float64 `json:"internal_temp"`
	UptimeSeconds 	int 	`json:"uptime_seconds"`
	BloodRawValue 	int 	`json:"blood_raw_value"`
}

type DeviceResponse struct {
	SN 					string 				`json:"SN"`
	AliasName 			string 				`json:"AliasName"`
	Status 				string 				`json:"Status"`
	LastSeen 			string 				`json:"last_seen"`
	DeviceSetting 		DeviceSetting 		`json:"DeviceSetting"`
	LatestTelemetry 	*TelemetrySnapshot 	`json:"latest_telemetry"`
	CurrentPatientID 	*uint 				`json:"current_patient_id"`
	CurrentPatientName 	*string 			`json:"current_patient_name"`
}