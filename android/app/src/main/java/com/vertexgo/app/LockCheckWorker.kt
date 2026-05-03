package com.vertexgo.app

import android.content.Context
import android.util.Log
import androidx.work.*
import kotlinx.coroutines.runBlocking
import java.util.concurrent.TimeUnit

/**
 * LockCheckWorker
 *
 * WorkManager fallback. Scheduled when LockMonitorService is killed.
 * Also re-starts the foreground service so polling continues normally.
 * WorkManager persists across reboots by default.
 */
class LockCheckWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "LockCheckWorker"
        private const val WORK_NAME = "vertexgo_lock_check"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<LockCheckWorker>(
                15, TimeUnit.MINUTES  // Minimum interval WorkManager allows
            )
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.MINUTES)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
            Log.i(TAG, "LockCheckWorker scheduled")
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "WorkManager check running")
        return try {
            // Re-start the foreground service (main polling engine)
            LockMonitorService.start(context)

            // Also do a direct poll as a backup in case service start is delayed
            val prefs = SecurePrefs.get(context)
            val deviceId = prefs.deviceId
            if (deviceId != null) {
                val result = SupabaseClient.getPendingCommands(deviceId)
                result.onSuccess { commands ->
                    if (commands.isNotEmpty()) {
                        Log.i(TAG, "Worker found ${commands.size} pending commands — service will handle")
                    }
                }
            }
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Worker failed", e)
            Result.retry()
        }
    }
}
