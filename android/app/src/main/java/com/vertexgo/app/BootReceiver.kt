package com.vertexgo.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BootReceiver
 *
 * Listens for BOOT_COMPLETED and LOCKED_BOOT_COMPLETED.
 * Restarts LockMonitorService after every reboot so the
 * device stays synced with Supabase even after restart.
 *
 * As Device Owner, we also get ACTION_LOCKED_BOOT_COMPLETED
 * which fires earlier (before user unlocks), giving us
 * maximum coverage.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.LOCKED_BOOT_COMPLETED",
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                Log.i(TAG, "Boot/update received — restarting Vertex Go services")

                val prefs = SecurePrefs.get(context)
                if (prefs.isEnrolled) {
                    // Start the foreground polling service
                    LockMonitorService.start(context)

                    // Schedule WorkManager as backup
                    LockCheckWorker.schedule(context)

                    // If device was locked before reboot, re-apply lock
                    if (prefs.isLocked) {
                        Log.i(TAG, "Device was locked before reboot — re-launching lock screen")
                        val lockIntent = Intent(context, LockScreenActivity::class.java).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                        }
                        context.startActivity(lockIntent)
                    }
                }
            }
        }
    }
}
