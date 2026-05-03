package com.vertexgo.app

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * LockScreenActivity
 *
 * Shown as a full-screen overlay when the device payment is overdue.
 * As Device Owner we call dpm.lockNow() which locks the screen.
 * This activity appears ON TOP of the lock screen with a clear
 * payment-required message and cannot be dismissed by the user.
 *
 * When Device Owner, we also set the lock screen message via
 * DevicePolicyManager.setDeviceOwnerLockScreenInfo().
 */
class LockScreenActivity : AppCompatActivity() {

    private lateinit var prefs: SecurePrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        prefs = SecurePrefs.get(this)

        // Show over lock screen — no dismiss
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )

        setContentView(R.layout.activity_lock_screen)

        val tvName    = findViewById<TextView>(R.id.tvLockedCustomerName)
        val tvAccount = findViewById<TextView>(R.id.tvLockedAccount)
        val tvAmount  = findViewById<TextView>(R.id.tvLockedAmount)

        tvName.text    = prefs.customerName ?: "Customer"
        tvAccount.text = "Account: ${prefs.accountNumber ?: "—"}"
        tvAmount.text  = "K${prefs.dailyRate}/day payment required"

        // Prevent back button from dismissing
        onBackPressedDispatcher.addCallback(this,
            object : androidx.activity.OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    // Do nothing — device stays locked
                }
            }
        )
    }

    override fun onResume() {
        super.onResume()
        // If device has been unlocked (payment received), go to main
        if (!prefs.isLocked) {
            startActivity(Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK)
            })
            finish()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (!prefs.isLocked) finish()
    }
}
