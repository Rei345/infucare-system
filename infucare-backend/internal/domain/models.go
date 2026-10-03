package domain

import "time"

// HealthUnit represents a hospital or clinic branch.
type HealthUnit struct {
	ID                  uint                 `gorm:"primaryKey" json:"id"`
	Name                string               `gorm:"type:varchar(255);not null" json:"name"`
	Address             string               `gorm:"type:text" json:"address"`
	UnitCode            string               `gorm:"type:varchar(100);unique;not null" json:"unit_code"`
	Users               []User               `gorm:"foreignKey:UnitID" json:"users,omitempty"`
	Patients            []Patient            `gorm:"foreignKey:UnitID" json:"patients,omitempty"`
	Devices             []Device             `gorm:"foreignKey:UnitID" json:"devices,omitempty"`
	NotificationConfigs []NotificationConfig `gorm:"foreignKey:UnitID" json:"notification_configs,omitempty"`
	CreatedAt           time.Time            `json:"created_at"`
	UpdatedAt           time.Time            `json:"updated_at"`
}

// User represents system operators like nurses or admins.
type User struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	UnitID     uint       `gorm:"not null" json:"unit_id"`
	HealthUnit HealthUnit `gorm:"foreignKey:UnitID" json:"health_unit,omitempty"`
	Name       string     `gorm:"type:varchar(255);not null" json:"name"`
	Username   string     `gorm:"type:varchar(100);unique;not null" json:"username"`
	Password   string     `gorm:"type:varchar(255);not null" json:"-"`
	Role       string     `gorm:"type:varchar(50);not null" json:"role"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// Patient represents individuals receiving infusion therapy.
type Patient struct {
	ID               uint              `gorm:"primaryKey" json:"id"`
	UnitID           uint              `gorm:"not null" json:"unit_id"`
	HealthUnit       HealthUnit        `gorm:"foreignKey:UnitID" json:"health_unit,omitempty"`
	Name             string            `gorm:"type:varchar(255);not null" json:"name"`
	RegistrationNo   string            `gorm:"type:varchar(100);unique;not null" json:"registration_no"`
	Address          string            `gorm:"type:text" json:"address"`
	InfusionSessions []InfusionSession `gorm:"foreignKey:PatientID" json:"infusion_sessions,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
}

// Device represents the ESP32 hardware endpoint.
type Device struct {
	SN               string            `gorm:"primaryKey;type:varchar(100)" json:"sn"`
	UnitID           *uint             `gorm:"index" json:"unit_id"`
	HealthUnit       *HealthUnit       `gorm:"foreignKey:UnitID" json:"health_unit,omitempty"`
	SecretKey        string            `gorm:"type:varchar(255)" json:"-"` 
	AliasName        string            `gorm:"type:varchar(255)" json:"alias_name"`
	Status           string            `gorm:"type:varchar(50)" json:"status"`
	DeviceSetting    DeviceSetting     `gorm:"foreignKey:DeviceSN;references:SN" json:"device_setting,omitempty"`
	InfusionSessions []InfusionSession `gorm:"foreignKey:DeviceSN;references:SN" json:"infusion_sessions,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
}

// DeviceSetting contains hardware-specific configurations.
type DeviceSetting struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	DeviceSN       string  `gorm:"type:varchar(100);unique;not null" json:"device_sn"`
	SpeakerVolume  int     `json:"speaker_volume"`
	AutoStopBlood  bool    `json:"auto_stop_blood"`
	AutoStopEmpty  bool    `json:"auto_stop_empty"`
	LoadcellOffset float64 `json:"loadcell_offset"`
}

// FluidProfile standardizes liquid density for drop calculations.
type FluidProfile struct {
	ID               uint              `gorm:"primaryKey" json:"id"`
	Name             string            `gorm:"type:varchar(255);not null" json:"name"`
	Density          float64           `gorm:"not null" json:"density"`
	InfusionSessions []InfusionSession `gorm:"foreignKey:FluidID" json:"infusion_sessions,omitempty"`
}

// InfusionSession represents a single active or historical medical event.
type InfusionSession struct {
	ID                 uint            `gorm:"primaryKey" json:"id"`
	PatientID          uint            `gorm:"not null" json:"patient_id"`
	Patient            Patient         `gorm:"foreignKey:PatientID" json:"patient,omitempty"`
	DeviceSN           string          `gorm:"type:varchar(100);not null" json:"device_sn"`
	Device             Device          `gorm:"foreignKey:DeviceSN;references:SN" json:"device,omitempty"`
	FluidID            uint            `gorm:"not null" json:"fluid_id"`
	FluidProfile       FluidProfile    `gorm:"foreignKey:FluidID" json:"fluid_profile,omitempty"`
	TargetTpm          int             `json:"target_tpm"`
	BottleCount        int             `json:"bottle_count"`
	TotalAccumulatedMl float64         `json:"total_accumulated_ml"`
	ControlMode        string          `gorm:"type:varchar(20)" json:"control_mode"`
	EstimatedEndAt     time.Time       `json:"estimated_end_at"`
	StartAt            time.Time       `json:"start_at"`
	EndAt              *time.Time      `json:"end_at,omitempty"`
	TelemetryData      []TelemetryData `gorm:"foreignKey:SessionID" json:"telemetry_data,omitempty"`
	ActivityLogs       []ActivityLog   `gorm:"foreignKey:SessionID" json:"activity_logs,omitempty"`
}

// TelemetryData stores timeseries data from the hardware.
type TelemetryData struct {
	ID            uint64    `gorm:"primaryKey" json:"id"`
	SessionID     uint      `gorm:"index;not null" json:"session_id"` 
	WeightGram    float64   `json:"weight_gram"`
	Tpm           int       `json:"tpm"`
	BloodRawValue int       `json:"blood_raw_value"`
	BatteryPct    int       `json:"battery_pct"`
	SignalDbm     int       `json:"signal_dbm"`
	InternalTemp  float64   `json:"internal_temp"`
	UptimeSeconds int       `json:"uptime_seconds"`
	CreatedAt     time.Time `gorm:"index" json:"created_at"` 
}

// ActivityLog records system events for audit trails.
type ActivityLog struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	SessionID   uint      `gorm:"index;not null" json:"session_id"`
	EventType   string    `gorm:"type:varchar(100);not null" json:"event_type"`
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `gorm:"autoCreateTime;index" json:"created_at"`
}

// NotificationConfig holds WhatsApp/Alert preferences per unit.
type NotificationConfig struct {
	ID                   uint       `gorm:"primaryKey" json:"id"`
	UnitID               uint       `gorm:"not null" json:"unit_id"`
	HealthUnit           HealthUnit `gorm:"foreignKey:UnitID" json:"health_unit,omitempty"`
	Provider             string     `gorm:"type:varchar(100)" json:"provider"`
	TargetID             string     `gorm:"type:varchar(255)" json:"target_id"`
	IsActive             bool       `json:"is_active"`
	NotifyBlood          bool       `json:"notify_blood"`
	NotifyEmptyFluid     bool       `json:"notify_empty_fluid"`
	NotifyLowFluid       bool       `json:"notify_low_fluid"`
	NotifyLowBattery     bool       `json:"notify_low_battery"`
	NotifyOffline        bool       `json:"notify_offline"`
	NotifyFailsafe       bool       `json:"notify_failsafe"`
	GlobalVolume         int        `json:"global_volume"`
	GlobalMute           bool       `json:"global_mute"`
	MuteGatewayBuzzer    bool       `json:"mute_gateway_buzzer"`
	LowFluidThresholdPct int        `gorm:"column:low_fluid_threshold_pct;default:15" json:"low_fluid_threshold_pct"`
	AutoStopThresholdPct int        `gorm:"column:auto_stop_threshold_pct;default:5" json:"auto_stop_threshold_pct"`
	BloodSensorThreshold int        `gorm:"default:515" json:"blood_sensor_threshold"`
}