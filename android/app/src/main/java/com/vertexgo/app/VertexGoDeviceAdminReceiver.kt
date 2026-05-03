package com.vertexgo.app

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * VertexGo DeviceAdminReceiver
 *
 * This is the core of the Device Owner capability. When enrolled as Device Owner
 * via Android's DPC (Device Policy Controller) flow, this app:
 *  - Persists across factory resets (when enrolled as Device Owner via NFC/QR)
 *  - Cannot be uninstalled by the user
 *  - Can lock the device screen
 *  - Can set a lock screen message
 *  - Can disable the camera, settings changes, etc.
 *
 * Enrollment: Use Android Management API or the DPC identifier QR code approach.
 * The QR payload includes: {"android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME":
 * "com.vertexgo.app", ...enrollment token...}
 */
class VertexGoDeviceAdminReceiver : DeviceAdminReceiver() {

    companion object {
        private const val TAG = "VertexGoAdmin"

        fun getComponentName(context: Context): ComponentName {
            return ComponentName(context.applicationContext, VertexGoDeviceAdminReceiver::class.java)
        }

        fun isDeviceOwner(context: Context): Boolean {
            val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
            return dpm.isDeviceOwnerApp(context.packageName)
        }
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device Admin Enabled")
        // Start the polling service as soon as we get admin rights
        context.startService(Intent(context, LockMonitorService::class.java))
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "WARNING: Disabling Vertex Go admin will violate your loan agreement and may result in legal action."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w(TAG, "Device Admin Disabled")
    }

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        super.onProfileProvisioningComplete(context, intent)
        Log.i(TAG, "Provisioning complete — Device Owner enrolled")

        // Mark device as enrolled and start the main activity for customer login
        val prefs = SecurePrefs.get(context)
        prefs.isEnrolled = true

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra("ENROLLMENT_COMPLETE", true)
        }
        context.startActivity(launchIntent)
    }

    override fun onLockTaskModeEntering(context: Context, intent: Intent, pkg: String) {
        Log.i(TAG, "Lock task mode entering: $pkg")
    }

    override fun onLockTaskModeExiting(context: Context, intent: Intent) {
        Log.i(TAG, "Lock task mode exiting")
    }
}
