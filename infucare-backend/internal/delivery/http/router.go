package httpdelivery

import (
	"time"

	"infucare-backend/pkg/auth"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter(
	authH *AuthHandler,
	dashboardH *DashboardHandler,
	healthUnitH *HealthUnitHandler,
	fluidH *FluidHandler,
	patientH *PatientHandler,
	trackingH *TrackingHandler,
	telemetryH *TelemetryHandler,
	deviceH *DeviceHandler,
	controlH *ControlHandler,
	notificationH *NotificationHandler,
	sessionH *SessionHandler,
) *gin.Engine {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins: 		[]string{"http://localhost:3000"},
		AllowMethods: 		[]string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: 		[]string{"Origin,", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders: 		[]string{"Content-Length"},
		AllowCredentials: 	true,
		MaxAge: 			12 * time.Hour,
	}))

	api := r.Group("/api/v1")
	{
		// 1. RUTE PUBLIK
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/login", authH.Login)
		}

		// 2. RUTE PRIVAT
		protected := api.Group("/")
		protected.Use(auth.JWTAuthMiddleware())
		{
			// Dashboard & Analytics
			protected.GET("/dashboard/active", dashboardH.GetActiveMonitoring)
			protected.GET("/analytics/session/:id/history", dashboardH.GetTelemetryHistory)
			protected.GET("/analytics/summary", dashboardH.GetAnalyticsSummary)

			// Health Unit
			protected.GET("/health-units", healthUnitH.GetHealthUnits)
			protected.POST("/health-units", healthUnitH.CreateHealthUnit)

			// Device Management
			protected.POST("/devices", deviceH.ActivateDevice)
			protected.GET("/devices", deviceH.GetDevices)
			protected.DELETE("/devices/:sn", deviceH.UnlinkDevice)
			protected.PUT("/devices/:sn/settings", deviceH.UpdateDeviceSettings)

			// Fluid Profiles
			protected.POST("/fluids", fluidH.CreateFluidProfile)
			protected.GET("/fluids", fluidH.GetFluidProfiles)

			// Hardware Remote Control 
			protected.POST("/control/device/:sn/lock", controlH.LockActuator)
			protected.POST("/control/device/:sn/unlock", controlH.UnlockActuator)
			protected.POST("/control/gateway/mute", controlH.MuteGatewayBuzzer)
			protected.POST("/control/gateway/unmute", controlH.UnmuteGatewayBuzzer)

			// Settings & Notifications
			protected.GET("/settings", notificationH.GetSettings)
			protected.PUT("/settings", notificationH.UpdateSettings)
			protected.POST("/settings/test-wa", notificationH.TestWhatsApp)

			// Patients
			protected.POST("/patients", patientH.CreatePatient)
			protected.GET("/patients", patientH.GetPatients)
			protected.PUT("/patients/:id", patientH.UpdatePatient)
			protected.DELETE("/patients/:id", patientH.DeletePatient)

			// Sessions
			protected.POST("/sessions", sessionH.StartSession)
			protected.PUT("/sessions/:id/tare", sessionH.TareSession)
			protected.PUT("/sessions/:id/end", sessionH.EndSession)
			protected.PUT("/sessions/:id/tpm", sessionH.UpdateSessionTpm)

			// Telemetry
			protected.POST("/telemetry", telemetryH.ReceiveTelemetryFromGateway)

			// Log Activity
			protected.GET("/history", trackingH.GetGlobalHistoryLogs)
			protected.GET("/patients/:id/tracking", trackingH.GetPatientTracking)
		}
	}

	return r
}