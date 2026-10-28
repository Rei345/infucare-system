package domain

// NotificationSettingsPayload shapes the JSON structure for both GET and PUT settings API.
type NotificationSettingsPayload struct {
	MasterMuteWa         bool   `json:"masterMuteWa"`
	GlobalMuteHardware   bool   `json:"globalMuteHardware"`
	MuteGatewayBuzzer    bool   `json:"muteGatewayBuzzer"`
	GlobalVolume         int    `json:"globalVolume" binding:"gte=0,lte=100"`
	WaNumber             string `json:"waNumber"`
	EmptyFluidPercentage int    `json:"emptyFluidPercentage" binding:"gte=5,lte=50"`
	AutoStopThresholdPct int    `json:"autoStopThresholdPct" binding:"gte=1,lte=30"`
	BloodSensorThreshold int    `json:"bloodSensorThreshold" binding:"gte=50,lte=5000"`
	AlertBlood           bool   `json:"alertBlood"`
	AlertEmpty           bool   `json:"alertEmpty"`
	Alert15Min           bool   `json:"alert15Min"`
	AlertLowBattery      bool   `json:"alertLowBattery"`
	AlertOffline         bool   `json:"alertOffline"`
	AlertFailsafe        bool   `json:"alertFailsafe"`
}