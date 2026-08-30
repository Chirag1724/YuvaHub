import { Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { getApprovedChannels, dispatchEmail, dispatchPush } from '../services/multiChannelDeliveryService';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * BullMQ Worker for processing and routing multi-channel notifications.
 */
export const notificationWorker = new Worker(
    'multi_channel_notifications',
    async (job: Job) => {
        const { userId, eventType, payload, isCritical } = job.data;
        logger.info(`Processing notification for user ${userId}, type: ${eventType}`);

        try {
            // 1. Determine approved channels based on user preferences
            const approvedChannels = await getApprovedChannels(userId, eventType, isCritical);

            if (approvedChannels.length === 0) {
                logger.info(`No approved channels for user ${userId}, type ${eventType}. Skipping.`);
                return { status: 'skipped', reason: 'no_approved_channels' };
            }

            // 2. Fetch user details for delivery
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // 3. Dispatch to approved channels
            const results = [];

            if (approvedChannels.includes('inApp')) {
                // Mock in-app notification save
                // await InAppNotification.create({ userId, ...payload });
                results.push('inApp: queued');
            }

            if (approvedChannels.includes('email') && user.email) {
                await dispatchEmail(user.email, payload.subject || 'New Notification', payload.html || 'You have a new update.');
                results.push('email: sent');
            }

            if (approvedChannels.includes('push')) {
                await dispatchPush(userId, payload.title || 'Update', payload.body || 'Check the app for details.');
                results.push('push: sent');
            }

            logger.info(`Successfully dispatched notification to channels: ${results.join(', ')}`);
            return { status: 'success', channels: results };
        } catch (error) {
            logger.error(`Notification dispatch failed for user ${userId}:`, error);
            throw error; // BullMQ will retry based on attempts config
        }
    },
    { connection: redisClient }
);
