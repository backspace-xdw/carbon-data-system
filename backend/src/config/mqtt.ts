import mqtt, { MqttClient } from 'mqtt'
import { logger } from '../utils/logger'

let client: MqttClient | null = null

export function getMQTTClient(): MqttClient | null {
  return client
}

export async function initializeMQTT(): Promise<void> {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'

  return new Promise((resolve) => {
    try {
      client = mqtt.connect(brokerUrl, {
        clientId: `carbon-system-${Date.now()}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 5000,
      })

      client.on('connect', () => {
        logger.info(`MQTT connected to ${brokerUrl}`)
        // Subscribe to meter data topics
        client!.subscribe('meters/+/data', { qos: 1 })
        client!.subscribe('meters/+/status', { qos: 0 })
        logger.info('MQTT subscribed to meter topics')
        resolve()
      })

      client.on('error', (error) => {
        logger.error('MQTT error:', error)
      })

      client.on('reconnect', () => {
        logger.debug('MQTT reconnecting...')
      })

      // Resolve after timeout even if not connected (non-blocking)
      setTimeout(() => {
        if (!client?.connected) {
          logger.warn('MQTT connection timeout — continuing without MQTT')
          resolve()
        }
      }, 5000)
    } catch (error) {
      logger.error('MQTT initialization failed:', error)
      resolve()
    }
  })
}

export function closeMQTT(): void {
  if (client) {
    client.end()
    logger.info('MQTT connection closed')
  }
}
