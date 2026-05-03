package com.vertexgo.app

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

data class CustomerProfile(
    val id: String = "",
    val account_number: String = "",
    val full_name: String = "",
    val phone_number: String = ""
)

data class LoanInfo(
    val id: String = "",
    val customer_id: String = "",
    val device_id: String = "",
    val device_price: Double = 0.0,
    val daily_rate: Double = 0.0,
    val total_paid: Double = 0.0,
    val balance_due: Double = 0.0,
    val status: String = "active",
    val next_due_date: String? = null,
    val days_overdue: Int = 0
)

data class DeviceCommand(
    val id: String = "",
    val device_id: String = "",
    val command: String = "",
    val status: String = "pending"
)

data class DeviceInfo(
    val id: String = "",
    val device_imei: String = "",
    val device_model: String = "",
    val is_locked: Boolean = false,
    val is_enrolled: Boolean = false,
    val customer_id: String = "",
    val daily_rate: Double = 0.0
)

object SupabaseClient {
    private const val TAG = "SupabaseClient"
    private val BASE_URL = BuildConfig.SUPABASE_URL
    private val ANON_KEY = BuildConfig.SUPABASE_ANON_KEY
    private val JSON = "application/json; charset=utf-8".toMediaType()
    private val gson = Gson()

    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private var accessToken: String? = null

    // ─── Auth ─────────────────────────────────────────────────────────────────
    suspend fun signInWithAccountNumber(accountNumber: String, deviceId: String): Result<CustomerProfile> =
        withContext(Dispatchers.IO) {
            try {
                // Customer "login" = look up by account_number (no password needed for customer view)
                val url = "$BASE_URL/rest/v1/customers?account_number=eq.$accountNumber&select=*"
                val req = Request.Builder()
                    .url(url)
                    .get()
                    .addHeader("apikey", ANON_KEY)
                    .addHeader("Authorization", "Bearer $ANON_KEY")
                    .build()
                val resp = http.newCall(req).execute()
                val body = resp.body?.string() ?: "[]"
                val type = object : TypeToken<List<CustomerProfile>>() {}.type
                val list: List<CustomerProfile> = gson.fromJson(body, type)
                if (list.isEmpty()) Result.failure(Exception("Account not found"))
                else Result.success(list[0])
            } catch (e: Exception) {
                Log.e(TAG, "Sign in failed", e)
                Result.failure(e)
            }
        }

    // ─── Device commands (poll) ────────────────────────────────────────────────
    suspend fun getPendingCommands(deviceId: String): Result<List<DeviceCommand>> =
        withContext(Dispatchers.IO) {
            try {
                val url = "$BASE_URL/rest/v1/device_commands?device_id=eq.$deviceId&status=eq.pending&select=*"
                val req = Request.Builder().url(url).get()
                    .addHeader("apikey", ANON_KEY)
                    .addHeader("Authorization", "Bearer $ANON_KEY")
                    .build()
                val resp = http.newCall(req).execute()
                val body = resp.body?.string() ?: "[]"
                val type = object : TypeToken<List<DeviceCommand>>() {}.type
                Result.success(gson.fromJson(body, type))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun markCommandExecuted(commandId: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val body = gson.toJson(mapOf("status" to "executed")).toRequestBody(JSON)
                val req = Request.Builder()
                    .url("$BASE_URL/rest/v1/device_commands?id=eq.$commandId")
                    .patch(body)
                    .addHeader("apikey", ANON_KEY)
                    .addHeader("Authorization", "Bearer $ANON_KEY")
                    .addHeader("Prefer", "return=minimal")
                    .build()
                http.newCall(req).execute()
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    // ─── Device info ──────────────────────────────────────────────────────────
    suspend fun getDevice(deviceId: String): Result<DeviceInfo> =
        withContext(Dispatchers.IO) {
            try {
                val url = "$BASE_URL/rest/v1/devices?id=eq.$deviceId&select=*"
                val req = Request.Builder().url(url).get()
                    .addHeader("apikey", ANON_KEY)
                    .addHeader("Authorization", "Bearer $ANON_KEY")
                    .build()
                val resp = http.newCall(req).execute()
                val body = resp.body?.string() ?: "[]"
                val type = object : TypeToken<List<DeviceInfo>>() {}.type
                val list: List<DeviceInfo> = gson.fromJson(body, type)
                if (list.isEmpty()) Result.failure(Exception("Device not found"))
                else Result.success(list[0])
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun markDeviceEnrolled(deviceId: String, androidId: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val body = gson.toJson(mapOf("is_enrolled" to true, "android_id" to androidId, "enrolled_at" to java.time.Instant.now().toString())).toRequestBody(JSON)
                val req = Request.Builder()
                    .url("$BASE_URL/rest/v1/devices?id=eq.$deviceId")
                    .patch(body)
                    .addHeader("apikey", ANON_KEY)
                    .addHeader("Authorization", "Bearer $ANON_KEY")
                    .addHeader("Prefer", "return=minimal")
                    .build()
                http.newCall(req).execute()
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    // ─── Loan info ────────────────────────────────────────────────────────────
    suspend fun getActiveLoan(customerId: String): Result<LoanInfo> =
        withContext(Dispatchers.IO) {
            try {
                val url = "$BASE_URL/rest/v1/loans?customer_id=eq.$customerId&status=eq.active&select=*"
                val req = Request.Builder().url(url).get()
                    .addHeader("apikey", ANON_KEY)
                    .addHeader("Authorization", "Bearer $ANON_KEY")
                    .build()
                val resp = http.newCall(req).execute()
                val body = resp.body?.string() ?: "[]"
                val type = object : TypeToken<List<LoanInfo>>() {}.type
                val list: List<LoanInfo> = gson.fromJson(body, type)
                if (list.isEmpty()) Result.failure(Exception("No active loan"))
                else Result.success(list[0])
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    // ─── Enrollment token ─────────────────────────────────────────────────────
    suspend fun useEnrollmentToken(token: String): Result<Map<String, Any>> =
        withContext(Dispatchers.IO) {
            try {
                val url = "$BASE_URL/rest/v1/enrollment_tokens?token=eq.$token&is_used=eq.false&select=*,devices(*),customers(*)"
                val req = Request.Builder().url(url).get()
                    .addHeader("apikey", ANON_KEY)
                    .addHeader("Authorization", "Bearer $ANON_KEY")
                    .build()
                val resp = http.newCall(req).execute()
                val body = resp.body?.string() ?: "[]"
                val type = object : TypeToken<List<Map<String, Any>>>() {}.type
                val list: List<Map<String, Any>> = gson.fromJson(body, type)
                if (list.isEmpty()) Result.failure(Exception("Invalid or expired token"))
                else Result.success(list[0])
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun markTokenUsed(tokenId: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            try {
                val body = gson.toJson(mapOf("is_used" to true)).toRequestBody(JSON)
                val req = Request.Builder()
                    .url("$BASE_URL/rest/v1/enrollment_tokens?id=eq.$tokenId")
                    .patch(body)
                    .addHeader("apikey", ANON_KEY)
                    .addHeader("Authorization", "Bearer $ANON_KEY")
                    .addHeader("Prefer", "return=minimal")
                    .build()
                http.newCall(req).execute()
                Result.success(Unit)
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}
