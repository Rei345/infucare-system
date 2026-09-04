export type PatientStatus = 'normal' | 'warning' | 'critical'

export interface Patient {
  id: string
  name: string
  rmNo: string
  bedId: string
  fluidType: string
  fluidLevel: number // percentage 0-100
  dripRate: number // TPM (Tetes Per Menit)
  targetTpm: number
  estimatedTimeLeft: string
  lastSynced: number // seconds ago
  flowActive: boolean
  bloodDetected: boolean
  isEmpty: boolean
  nurseCallActive: boolean
  status: PatientStatus
  deviceSn: string
  totalBottles: number
  totalMlAccumulated: number
  mlRemaining: number
}

export interface IoTDevice {
  id: string
  sn: string
  patientId: string | null
  patientName: string | null
  batteryVoltage: number
  batteryPercent: number
  rssi: number
  uptime: string
  internalTemp: number
  volume: number // 0-100%
  isOnline: boolean
  lastSeen: string
}

export interface LogEntry {
  id: string
  timestamp: string
  patientName: string
  patientId: string
  eventType: 'bottle_changed' | 'blood_detected' | 'servo_locked' | 'bidan_intervention' | 'flow_resumed' | 'device_paired'
  description: string
  severity: 'info' | 'warning' | 'critical'
}

export interface SystemSettings {
  telegramBotToken: string
  telegramChatId: string
  whatsappEnabled: boolean
  twilioSid: string
  twilioToken: string
  twilioPhone: string
  bloodSensitivity: number // 0-100
  lowFlowThreshold: number // TPM
  emptyThreshold: number // percentage
}

// Mock patients data
export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Siti Aminah',
    rmNo: 'RM-2024-001',
    bedId: 'Bed 1',
    fluidType: 'NaCl 0.9%',
    fluidLevel: 15,
    dripRate: 12,
    targetTpm: 20,
    estimatedTimeLeft: '~15 min',
    lastSynced: 2,
    flowActive: false,
    bloodDetected: true,
    isEmpty: false,
    nurseCallActive: true,
    status: 'critical',
    deviceSn: 'ESP32-001',
    totalBottles: 3,
    totalMlAccumulated: 1450,
    mlRemaining: 75
  },
  {
    id: '2',
    name: 'Dewi Lestari',
    rmNo: 'RM-2024-002',
    bedId: 'Bed 2',
    fluidType: 'RL (Ringer Lactate)',
    fluidLevel: 25,
    dripRate: 18,
    targetTpm: 20,
    estimatedTimeLeft: '~32 min',
    lastSynced: 5,
    flowActive: true,
    bloodDetected: false,
    isEmpty: false,
    nurseCallActive: false,
    status: 'warning',
    deviceSn: 'ESP32-002',
    totalBottles: 2,
    totalMlAccumulated: 980,
    mlRemaining: 125
  },
  {
    id: '3',
    name: 'Ratna Wulandari',
    rmNo: 'RM-2024-003',
    bedId: 'Bed 3',
    fluidType: 'D5% (Dextrose 5%)',
    fluidLevel: 78,
    dripRate: 20,
    targetTpm: 20,
    estimatedTimeLeft: '~2h 15min',
    lastSynced: 1,
    flowActive: true,
    bloodDetected: false,
    isEmpty: false,
    nurseCallActive: false,
    status: 'normal',
    deviceSn: 'ESP32-003',
    totalBottles: 1,
    totalMlAccumulated: 110,
    mlRemaining: 390
  },
  {
    id: '4',
    name: 'Maya Kusuma',
    rmNo: 'RM-2024-004',
    bedId: 'Bed 4',
    fluidType: 'NaCl 0.9%',
    fluidLevel: 92,
    dripRate: 22,
    targetTpm: 20,
    estimatedTimeLeft: '~3h 45min',
    lastSynced: 3,
    flowActive: true,
    bloodDetected: false,
    isEmpty: false,
    nurseCallActive: false,
    status: 'normal',
    deviceSn: 'ESP32-004',
    totalBottles: 1,
    totalMlAccumulated: 40,
    mlRemaining: 460
  },
  {
    id: '5',
    name: 'Rina Pratiwi',
    rmNo: 'RM-2024-005',
    bedId: 'Bed 5',
    fluidType: 'Aminofluid',
    fluidLevel: 5,
    dripRate: 0,
    targetTpm: 15,
    estimatedTimeLeft: 'Empty',
    lastSynced: 1,
    flowActive: false,
    bloodDetected: false,
    isEmpty: true,
    nurseCallActive: true,
    status: 'critical',
    deviceSn: 'ESP32-005',
    totalBottles: 4,
    totalMlAccumulated: 2000,
    mlRemaining: 25
  },
  {
    id: '6',
    name: 'Nur Hidayah',
    rmNo: 'RM-2024-006',
    bedId: 'Bed 6',
    fluidType: 'RL (Ringer Lactate)',
    fluidLevel: 55,
    dripRate: 19,
    targetTpm: 20,
    estimatedTimeLeft: '~1h 30min',
    lastSynced: 4,
    flowActive: true,
    bloodDetected: false,
    isEmpty: false,
    nurseCallActive: false,
    status: 'normal',
    deviceSn: 'ESP32-006',
    totalBottles: 2,
    totalMlAccumulated: 725,
    mlRemaining: 275
  }
]

// Mock IoT devices data
export const mockDevices: IoTDevice[] = [
  {
    id: '1',
    sn: 'ESP32-001',
    patientId: '1',
    patientName: 'Siti Aminah',
    batteryVoltage: 3.7,
    batteryPercent: 85,
    rssi: -45,
    uptime: '12h 34m',
    internalTemp: 42.5,
    volume: 75,
    isOnline: true,
    lastSeen: '2s ago'
  },
  {
    id: '2',
    sn: 'ESP32-002',
    patientId: '2',
    patientName: 'Dewi Lestari',
    batteryVoltage: 3.5,
    batteryPercent: 65,
    rssi: -52,
    uptime: '8h 12m',
    internalTemp: 38.2,
    volume: 80,
    isOnline: true,
    lastSeen: '5s ago'
  },
  {
    id: '3',
    sn: 'ESP32-003',
    patientId: '3',
    patientName: 'Ratna Wulandari',
    batteryVoltage: 4.1,
    batteryPercent: 98,
    rssi: -38,
    uptime: '2h 45m',
    internalTemp: 35.8,
    volume: 85,
    isOnline: true,
    lastSeen: '1s ago'
  },
  {
    id: '4',
    sn: 'ESP32-004',
    patientId: '4',
    patientName: 'Maya Kusuma',
    batteryVoltage: 3.9,
    batteryPercent: 92,
    rssi: -41,
    uptime: '5h 20m',
    internalTemp: 36.5,
    volume: 90,
    isOnline: true,
    lastSeen: '3s ago'
  },
  {
    id: '5',
    sn: 'ESP32-005',
    patientId: '5',
    patientName: 'Rina Pratiwi',
    batteryVoltage: 3.3,
    batteryPercent: 45,
    rssi: -58,
    uptime: '18h 05m',
    internalTemp: 44.1,
    volume: 70,
    isOnline: true,
    lastSeen: '1s ago'
  },
  {
    id: '6',
    sn: 'ESP32-006',
    patientId: '6',
    patientName: 'Nur Hidayah',
    batteryVoltage: 3.8,
    batteryPercent: 88,
    rssi: -47,
    uptime: '6h 50m',
    internalTemp: 37.2,
    volume: 82,
    isOnline: true,
    lastSeen: '4s ago'
  },
  {
    id: '7',
    sn: 'ESP32-007',
    patientId: null,
    patientName: null,
    batteryVoltage: 0,
    batteryPercent: 0,
    rssi: 0,
    uptime: '-',
    internalTemp: 0,
    volume: 50,
    isOnline: false,
    lastSeen: '2h ago'
  }
]

// Mock log entries
export const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15 14:32:15',
    patientName: 'Siti Aminah',
    patientId: '1',
    eventType: 'blood_detected',
    description: 'Blood reflux detected in IV line. Servo locked automatically.',
    severity: 'critical'
  },
  {
    id: '2',
    timestamp: '2024-01-15 14:30:00',
    patientName: 'Rina Pratiwi',
    patientId: '5',
    eventType: 'bottle_changed',
    description: 'IV bottle replaced. New bottle: Aminofluid 500ml',
    severity: 'info'
  },
  {
    id: '3',
    timestamp: '2024-01-15 14:25:45',
    patientName: 'Dewi Lestari',
    patientId: '2',
    eventType: 'bidan_intervention',
    description: 'Manual flow rate adjustment by Bidan. TPM changed from 15 to 20.',
    severity: 'info'
  },
  {
    id: '4',
    timestamp: '2024-01-15 14:20:30',
    patientName: 'Rina Pratiwi',
    patientId: '5',
    eventType: 'servo_locked',
    description: 'Fluid level critical (<5%). Servo locked for safety.',
    severity: 'warning'
  },
  {
    id: '5',
    timestamp: '2024-01-15 14:15:00',
    patientName: 'Ratna Wulandari',
    patientId: '3',
    eventType: 'device_paired',
    description: 'Device ESP32-003 successfully paired with patient.',
    severity: 'info'
  },
  {
    id: '6',
    timestamp: '2024-01-15 14:10:22',
    patientName: 'Maya Kusuma',
    patientId: '4',
    eventType: 'flow_resumed',
    description: 'Flow resumed after brief pause. All readings normal.',
    severity: 'info'
  },
  {
    id: '7',
    timestamp: '2024-01-15 14:05:18',
    patientName: 'Siti Aminah',
    patientId: '1',
    eventType: 'bottle_changed',
    description: 'IV bottle replaced. New bottle: NaCl 0.9% 500ml',
    severity: 'info'
  },
  {
    id: '8',
    timestamp: '2024-01-15 13:55:40',
    patientName: 'Nur Hidayah',
    patientId: '6',
    eventType: 'bidan_intervention',
    description: 'Patient positioned adjusted. Flow rate stable.',
    severity: 'info'
  }
]

// Mock fluid types
export const fluidTypes = [
  'NaCl 0.9%',
  'RL (Ringer Lactate)',
  'D5% (Dextrose 5%)',
  'D10% (Dextrose 10%)',
  'Aminofluid',
  'Gelofusine',
  'Haemaccel',
  'Whole Blood',
  'Packed Red Cells'
]

// Mock system settings
export const mockSettings: SystemSettings = {
  telegramBotToken: '',
  telegramChatId: '',
  whatsappEnabled: false,
  twilioSid: '',
  twilioToken: '',
  twilioPhone: '',
  bloodSensitivity: 75,
  lowFlowThreshold: 10,
  emptyThreshold: 10
}

// Patient tracking history
export interface PatientSession {
  id: string
  patientId: string
  patientName: string
  deviceSn: string
  startTime: string
  endTime: string | null
  duration: string
  totalMl: number
  bottlesUsed: number
  events: PatientEvent[]
}

export interface PatientEvent {
  id: string
  timestamp: string
  type: 'start' | 'bottle_change' | 'flow_pause' | 'flow_resume' | 'blood_detected' | 'intervention' | 'end'
  description: string
}

export const mockPatientSessions: PatientSession[] = [
  {
    id: '1',
    patientId: '1',
    patientName: 'Siti Aminah',
    deviceSn: 'ESP32-001',
    startTime: '2024-01-15 08:30:00',
    endTime: null,
    duration: '6h 2m',
    totalMl: 1450,
    bottlesUsed: 3,
    events: [
      { id: '1', timestamp: '2024-01-15 08:30:00', type: 'start', description: 'Infusion started - NaCl 0.9% 500ml' },
      { id: '2', timestamp: '2024-01-15 10:15:00', type: 'bottle_change', description: 'Bottle 1 completed, Bottle 2 started' },
      { id: '3', timestamp: '2024-01-15 12:00:00', type: 'bottle_change', description: 'Bottle 2 completed, Bottle 3 started' },
      { id: '4', timestamp: '2024-01-15 14:32:15', type: 'blood_detected', description: 'Blood reflux detected - Flow locked automatically' }
    ]
  },
  {
    id: '2',
    patientId: '2',
    patientName: 'Dewi Lestari',
    deviceSn: 'ESP32-002',
    startTime: '2024-01-15 09:45:00',
    endTime: null,
    duration: '4h 47m',
    totalMl: 980,
    bottlesUsed: 2,
    events: [
      { id: '1', timestamp: '2024-01-15 09:45:00', type: 'start', description: 'Infusion started - RL 500ml' },
      { id: '2', timestamp: '2024-01-15 11:30:00', type: 'bottle_change', description: 'Bottle 1 completed, Bottle 2 started' },
      { id: '3', timestamp: '2024-01-15 14:25:45', type: 'intervention', description: 'Manual TPM adjustment from 15 to 20' }
    ]
  },
  {
    id: '3',
    patientId: '3',
    patientName: 'Ratna Wulandari',
    deviceSn: 'ESP32-003',
    startTime: '2024-01-15 11:47:00',
    endTime: null,
    duration: '2h 45m',
    totalMl: 110,
    bottlesUsed: 1,
    events: [
      { id: '1', timestamp: '2024-01-15 11:47:00', type: 'start', description: 'Infusion started - D5% 500ml' },
      { id: '2', timestamp: '2024-01-15 14:15:00', type: 'flow_pause', description: 'Flow paused for patient repositioning' },
      { id: '3', timestamp: '2024-01-15 14:18:00', type: 'flow_resume', description: 'Flow resumed - All readings normal' }
    ]
  },
  {
    id: '4',
    patientId: '5',
    patientName: 'Rina Pratiwi',
    deviceSn: 'ESP32-005',
    startTime: '2024-01-14 20:00:00',
    endTime: null,
    duration: '18h 32m',
    totalMl: 2000,
    bottlesUsed: 4,
    events: [
      { id: '1', timestamp: '2024-01-14 20:00:00', type: 'start', description: 'Infusion started - Aminofluid 500ml' },
      { id: '2', timestamp: '2024-01-14 23:30:00', type: 'bottle_change', description: 'Bottle 1 completed, Bottle 2 started' },
      { id: '3', timestamp: '2024-01-15 03:00:00', type: 'bottle_change', description: 'Bottle 2 completed, Bottle 3 started' },
      { id: '4', timestamp: '2024-01-15 06:30:00', type: 'bottle_change', description: 'Bottle 3 completed, Bottle 4 started' },
      { id: '5', timestamp: '2024-01-15 10:00:00', type: 'intervention', description: 'Nurse check - patient stable' },
      { id: '6', timestamp: '2024-01-15 14:20:30', type: 'flow_pause', description: 'Fluid level critical - Servo locked' }
    ]
  }
]

// Historical sessions (completed)
export const mockHistoricalSessions: PatientSession[] = [
  {
    id: 'h1',
    patientId: 'h1',
    patientName: 'Ani Susanti',
    deviceSn: 'ESP32-002',
    startTime: '2024-01-14 07:00:00',
    endTime: '2024-01-14 15:30:00',
    duration: '8h 30m',
    totalMl: 2000,
    bottlesUsed: 4,
    events: [
      { id: '1', timestamp: '2024-01-14 07:00:00', type: 'start', description: 'Infusion started - NaCl 0.9% 500ml' },
      { id: '2', timestamp: '2024-01-14 15:30:00', type: 'end', description: 'Infusion completed successfully' }
    ]
  },
  {
    id: 'h2',
    patientId: 'h2',
    patientName: 'Budi Hartono',
    deviceSn: 'ESP32-004',
    startTime: '2024-01-13 10:00:00',
    endTime: '2024-01-13 16:45:00',
    duration: '6h 45m',
    totalMl: 1500,
    bottlesUsed: 3,
    events: [
      { id: '1', timestamp: '2024-01-13 10:00:00', type: 'start', description: 'Infusion started - RL 500ml' },
      { id: '2', timestamp: '2024-01-13 16:45:00', type: 'end', description: 'Infusion completed successfully' }
    ]
  }
]

// Helper function to get signal strength label
export function getSignalStrength(rssi: number): { label: string; color: string } {
  if (rssi >= -50) return { label: 'Excellent', color: 'text-success' }
  if (rssi >= -60) return { label: 'Good', color: 'text-success' }
  if (rssi >= -70) return { label: 'Fair', color: 'text-warning' }
  return { label: 'Poor', color: 'text-critical' }
}

// Helper function to get battery color
export function getBatteryColor(percent: number): string {
  if (percent >= 60) return 'text-success'
  if (percent >= 30) return 'text-warning'
  return 'text-critical'
}

// Generate chart data for patient analytics
export function generateFluidLevelHistory() {
  const data = []
  const now = new Date()
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      level: Math.max(0, 100 - (24 - i) * 4 + Math.random() * 5)
    })
  }
  return data
}

export function generateDripRateHistory() {
  const data = []
  const now = new Date()
  for (let i = 60; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 1000)
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      rate: 18 + Math.random() * 4
    })
  }
  return data
}
