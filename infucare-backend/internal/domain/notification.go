package domain

// NotificationSettingsPayload shapes the JSON structure for both GET and PUT settings API.
type NotificationSettingsPayload struct {
	MasterMuteWa         bool   `json:"masterMuteWa"`
	GlobalMuteHardware   bool   `json:"globalMuteHardware"`
	MuteGatewayBuzzer    bool   `json:"muteGatewayBuzzer"`
	GlobalVolume         int    `json:"globalVolume"`
	WaNumber             string `json:"waNumber"`
	EmptyFluidPercentage int    `json:"emptyFluidPercentage"`
	AutoStopThresholdPct int    `json:"autoStopThresholdPct"`
	BloodSensorThreshold int    `json:"bloodSensorThreshold"`
	AlertBlood           bool   `json:"alertBlood"`
	AlertEmpty           bool   `json:"alertEmpty"`
	Alert15Min           bool   `json:"alert15Min"`
	AlertLowBattery      bool   `json:"alertLowBattery"`
	AlertOffline         bool   `json:"alertOffline"`
	AlertFailsafe        bool   `json:"alertFailsafe"`
}