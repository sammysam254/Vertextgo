package com.vertexgo.app

import android.app.*
import android.app.admin.DevicePolicyManager
import android.content.*
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import java.util.concurrent.TimeUnit

/**
 * LockMonitorService
 *
 * A persistent foreground service that:
 *  1. Polls Supabase every 60s for pending device commands (lock/unlock/wipe)
 *  2. Executes the command via DevicePolicyManager
 *  3. Marks the command as executed
 *  4. Re-schedules itself via WorkManager as a fallback
 *
 * Running as foreground keeps it alive. Device Owner enrollment ensures
 * it auto-restarts via BOOT_COMPLETED broadcast.
 */
class LockMonitorService : Service() {

    companion object {
        private const val TAG = "LockMonitor"
        private const val CHANNEL_ID = "vertexgo_monitor"
        private const val NOTIF_ID = 1001
        private const val POLL_INTERVAL_MS = 60_000L  // 60 seconds

        fun start(context: Context) {
            val intent = Intent(context, LockMonitorService::class.java)
            context.startForegroundService(intent)
        }
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var dpm: DevicePolicyManager
    private lateinit var adminComponent: ComponentName
    private lateinit var prefs: SecurePrefs

    override fun onCreate() {
        super.onCreate()
        dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = VertexGoDeviceAdminReceiver.getComponentName(this)
        prefs = SecurePrefs.get(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification("Vertex Go — Device monitored"))
        startPolling()
        // START_STICKY ensures Android restarts us if killed
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
        // Schedule WorkManager as resurrection fallback
        LockCheckWorker.schedule(applicationContext)
    }

    // ─── Polling loop ─────────────────────────────────────────────────────────
    private fun startPolling() {
        scope.launch {
            while (isActive) {
                try {
                    poll()
                } catch (e: Exception) {
                    Log.e(TAG, "Poll error", e)
                }
                delay(POLL_INTERVAL_MS)
            }
        }
    }

    suspend fun poll() {
        val deviceId = prefs.deviceId ?: return
        Log.d(TAG, "Polling for commands — device: $deviceId")

        val result = SupabaseClient.getPendingCommands(deviceId)
        result.onSuccess { commands ->
            commands.forEach { cmd ->
                Log.i(TAG, "Executing command: ${cmd.command}")
                when (cmd.command) {
                    "lock"   -> executeLock()
                    "unlock" -> executeUnlock()
                    "wipe"   -> executeWipe()
                }
                SupabaseClient.markCommandExecuted(cmd.id)
            }
        }.onFailure {
            Log.w(TAG, "Failed to poll: ${it.message}")
        }
    }

    // ─── Command execution ────────────────────────────────────────────────────
    private fun executeLock() {
        if (!VertexGoDeviceAdminReceiver.isDeviceOwner(this)) {
            Log.w(TAG, "Not device owner — cannot lock")
            // Fallback: launch LockScreenActivity
            val i = Intent(this, LockScreenActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            }
            startActivity(i)
            return
        }
        try {
            // Set lock task / kiosk overlay
            dpm.setLockTaskPackages(adminComponent, arrayOf(packageName))
            // Lock the screen immediately
            dpm.lockNow()
            // Set a persistent lock message
            dpm.setDeviceOwnerLockScreenInfo(adminComponent,
                "This device is locked due to a pending payment.\nCall your Vertex Go agent to unlock.")
            prefs.isLocked = true
            updateNotification("🔒 Device LOCKED — Payment required")
            Log.i(TAG, "Device locked successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Lock failed", e)
        }
    }

    private fun executeUnlock() {
        if (!VertexGoDeviceAdminReceiver.isDeviceOwner(this)) return
        try {
            dpm.setDeviceOwnerLockScreenInfo(adminComponent, "Vertex Go — Powered by VertexGo")
            prefs.isLocked = false
            updateNotification("✓ Vertex Go — Device active")
            // If in lock task, exit it
            Log.i(TAG, "Device unlocked successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Unlock failed", e)
        }
    }

    private fun executeWipe() {
        if (!VertexGoDeviceAdminReceiver.isDeviceOwner(this)) return
        try {
            Log.w(TAG, "WIPE command received — wiping device")
            dpm.wipeData(DevicePolicyManager.WIPE_RESET_PROTECTION_DATA)
        } catch (e: Exception) {
            Log.e(TAG, "Wipe failed", e)
        }
    }

    // ─── Notifications ────────────────────────────────────────────────────────
    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Vertex Go Monitor",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Keeps your device loan status synced"
            setShowBadge(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val intent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vertex Go")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(intent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIF_ID, buildNotification(text))
    }
}
