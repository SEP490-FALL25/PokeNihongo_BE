import envConfig from '@/config/env.config'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as admin from 'firebase-admin'
import { Message, MulticastMessage } from 'firebase-admin/messaging'

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name)
  private messaging: admin.messaging.Messaging | null = null

  onModuleInit() {
    this.initializeFirebase()
  }

  private initializeFirebase() {
    try {
      const projectId = envConfig.FIREBASE_PROJECT_ID
      const clientEmail = envConfig.FIREBASE_CLIENT_EMAIL
      let privateKey = envConfig.FIREBASE_PRIVATE_KEY

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase credentials not fully configured (need FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications disabled.'
        )
        return
      }

      // Replace escaped newlines so key works when stored in .env
      privateKey = privateKey.replace(/\\n/g, '\n')

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
          })
        })
        this.logger.log('Firebase Admin SDK initialized successfully via env variables')
      }

      this.messaging = admin.messaging()
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error)
    }
  }

  /**
   * Gửi notification đến 1 device
   */
  async sendNotificationToDevice(
    fcmToken: string,
    payload: NotificationPayload
  ): Promise<boolean> {
    if (!this.messaging) {
      this.logger.warn('Firebase messaging not initialized')
      return false
    }

    try {
      const message: Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl })
        },
        ...(payload.data && { data: payload.data }),
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      }

      const response = await this.messaging.send(message)
      this.logger.log(`Notification sent successfully: ${response}`)
      return true
    } catch (error) {
      this.logger.error(`Failed to send notification to token ${fcmToken}`, error)
      return false
    }
  }

  /**
   * Gửi notification đến nhiều devices
   */
  async sendNotificationToMultipleDevices(
    fcmTokens: string[],
    payload: NotificationPayload
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.messaging) {
      this.logger.warn('Firebase messaging not initialized')
      return { successCount: 0, failureCount: fcmTokens.length }
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 }
    }

    try {
      const message: MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl })
        },
        ...(payload.data && { data: payload.data }),
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      }

      const response = await this.messaging.sendEachForMulticast(message)
      this.logger.log(
        `Sent ${response.successCount}/${fcmTokens.length} notifications successfully`
      )

      return {
        successCount: response.successCount,
        failureCount: response.failureCount
      }
    } catch (error) {
      this.logger.error('Failed to send notifications to multiple devices', error)
      return { successCount: 0, failureCount: fcmTokens.length }
    }
  }

  /**
   * Gửi notification đến topic
   */
  async sendNotificationToTopic(
    topic: string,
    payload: NotificationPayload
  ): Promise<boolean> {
    if (!this.messaging) {
      this.logger.warn('Firebase messaging not initialized')
      return false
    }

    try {
      const message: Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl })
        },
        ...(payload.data && { data: payload.data }),
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      }

      const response = await this.messaging.send(message)
      this.logger.log(`Notification sent to topic ${topic}: ${response}`)
      return true
    } catch (error) {
      this.logger.error(`Failed to send notification to topic ${topic}`, error)
      return false
    }
  }

  /**
   * Subscribe devices vào topic
   */
  async subscribeToTopic(fcmTokens: string[], topic: string): Promise<boolean> {
    if (!this.messaging) {
      this.logger.warn('Firebase messaging not initialized')
      return false
    }

    try {
      const response = await this.messaging.subscribeToTopic(fcmTokens, topic)
      this.logger.log(
        `Subscribed ${response.successCount}/${fcmTokens.length} devices to topic ${topic}`
      )
      return response.successCount > 0
    } catch (error) {
      this.logger.error(`Failed to subscribe devices to topic ${topic}`, error)
      return false
    }
  }

  /**
   * Unsubscribe devices khỏi topic
   */
  async unsubscribeFromTopic(fcmTokens: string[], topic: string): Promise<boolean> {
    if (!this.messaging) {
      this.logger.warn('Firebase messaging not initialized')
      return false
    }

    try {
      const response = await this.messaging.unsubscribeFromTopic(fcmTokens, topic)
      this.logger.log(
        `Unsubscribed ${response.successCount}/${fcmTokens.length} devices from topic ${topic}`
      )
      return response.successCount > 0
    } catch (error) {
      this.logger.error(`Failed to unsubscribe devices from topic ${topic}`, error)
      return false
    }
  }
}
