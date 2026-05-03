package com.vertexgo.app

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecurePrefs private constructor(private val prefs: SharedPreferences) {

    companion object {
        private const val FILE_NAME = "vertexgo_secure"
        private const val KEY_DEVICE_ID      = "device_id"
        private const val KEY_CUSTOMER_ID    = "customer_id"
        private const val KEY_ACCOUNT_NUMBER = "account_number"
        private const val KEY_CUSTOMER_NAME  = "customer_name"
        private const val KEY_IS_ENROLLED    = "is_enrolled"
        private const val KEY_IS_LOCKED      = "is_locked"
        private const val KEY_DAILY_RATE     = "daily_rate"
        private const val KEY_TOKEN_ID       = "token_id"

        @Volatile private var INSTANCE: SecurePrefs? = null

        fun get(context: Context): SecurePrefs {
            return INSTANCE ?: synchronized(this) {
                val masterKey = MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()
                val prefs = EncryptedSharedPreferences.create(
                    context,
                    FILE_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                )
                SecurePrefs(prefs).also { INSTANCE = it }
            }
        }
    }

    // ── Device ────────────────────────────────────────────────────────────────
    var deviceId: String?
        get() = prefs.getString(KEY_DEVICE_ID, null)
        set(v) = prefs.edit().putString(KEY_DEVICE_ID, v).apply()

    // FIX: removed duplicate setEnrolled() — var setter already generates it
    var isEnrolled: Boolean
        get() = prefs.getBoolean(KEY_IS_ENROLLED, false)
        set(v) = prefs.edit().putBoolean(KEY_IS_ENROLLED, v).apply()

    var isLocked: Boolean
        get() = prefs.getBoolean(KEY_IS_LOCKED, false)
        set(v) = prefs.edit().putBoolean(KEY_IS_LOCKED, v).apply()

    var dailyRate: Double
        get() = prefs.getString(KEY_DAILY_RATE, "0")?.toDoubleOrNull() ?: 0.0
        set(v) = prefs.edit().putString(KEY_DAILY_RATE, v.toString()).apply()

    var tokenId: String?
        get() = prefs.getString(KEY_TOKEN_ID, null)
        set(v) = prefs.edit().putString(KEY_TOKEN_ID, v).apply()

    // ── Customer ──────────────────────────────────────────────────────────────
    var customerId: String?
        get() = prefs.getString(KEY_CUSTOMER_ID, null)
        set(v) = prefs.edit().putString(KEY_CUSTOMER_ID, v).apply()

    var accountNumber: String?
        get() = prefs.getString(KEY_ACCOUNT_NUMBER, null)
        set(v) = prefs.edit().putString(KEY_ACCOUNT_NUMBER, v).apply()

    var customerName: String?
        get() = prefs.getString(KEY_CUSTOMER_NAME, null)
        set(v) = prefs.edit().putString(KEY_CUSTOMER_NAME, v).apply()

    fun isLoggedIn(): Boolean = customerId != null && accountNumber != null && isEnrolled

    fun clearCustomer() {
        prefs.edit()
            .remove(KEY_CUSTOMER_ID)
            .remove(KEY_ACCOUNT_NUMBER)
            .remove(KEY_CUSTOMER_NAME)
            .apply()
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }
}
