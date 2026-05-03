package com.vertexgo.app

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: SecurePrefs
    private lateinit var dpm: DevicePolicyManager
    private lateinit var adminComponent: ComponentName

    // Views — Login
    private lateinit var loginLayout: View
    private lateinit var etAccountNumber: EditText
    private lateinit var btnLogin: Button
    private lateinit var tvLoginError: TextView
    private lateinit var tvEnrollmentStatus: TextView

    // Views — Dashboard
    private lateinit var dashboardLayout: View
    private lateinit var tvCustomerName: TextView
    private lateinit var tvAccountNumber: TextView
    private lateinit var tvDeviceStatus: TextView
    private lateinit var tvDailyRate: TextView
    private lateinit var tvTotalPrice: TextView
    private lateinit var tvAmountPaid: TextView
    private lateinit var tvBalanceDue: TextView
    private lateinit var tvNextDue: TextView
    private lateinit var tvDaysLeft: TextView
    private lateinit var progressLoan: ProgressBar
    private lateinit var tvProgress: TextView
    private lateinit var tvWarning: TextView
    private lateinit var btnSignOut: Button
    private lateinit var loadingIndicator: ProgressBar

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = SecurePrefs.get(this)
        dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = VertexGoDeviceAdminReceiver.getComponentName(this)

        bindViews()
        setupListeners()

        // Start background service
        LockMonitorService.start(this)
        LockCheckWorker.schedule(this)

        // Route: if already logged in, show dashboard; else login
        if (prefs.isLoggedIn()) {
            showDashboard()
            refreshLoanData()
        } else {
            showLogin()
            // Show enrollment status hint
            if (VertexGoDeviceAdminReceiver.isDeviceOwner(this)) {
                tvEnrollmentStatus.text = "✓ Device Owner enrolled — Enter your account number"
                tvEnrollmentStatus.visibility = View.VISIBLE
            }
        }

        // Check if launched from enrollment completion
        if (intent.getBooleanExtra("ENROLLMENT_COMPLETE", false)) {
            tvEnrollmentStatus.text = "✓ Device enrolled! Log in with your account number."
            tvEnrollmentStatus.visibility = View.VISIBLE
        }
    }

    private fun bindViews() {
        loginLayout         = findViewById(R.id.loginLayout)
        etAccountNumber     = findViewById(R.id.etAccountNumber)
        btnLogin            = findViewById(R.id.btnLogin)
        tvLoginError        = findViewById(R.id.tvLoginError)
        tvEnrollmentStatus  = findViewById(R.id.tvEnrollmentStatus)

        dashboardLayout     = findViewById(R.id.dashboardLayout)
        tvCustomerName      = findViewById(R.id.tvCustomerName)
        tvAccountNumber     = findViewById(R.id.tvAccountNumber)
        tvDeviceStatus      = findViewById(R.id.tvDeviceStatus)
        tvDailyRate         = findViewById(R.id.tvDailyRate)
        tvTotalPrice        = findViewById(R.id.tvTotalPrice)
        tvAmountPaid        = findViewById(R.id.tvAmountPaid)
        tvBalanceDue        = findViewById(R.id.tvBalanceDue)
        tvNextDue           = findViewById(R.id.tvNextDue)
        tvDaysLeft          = findViewById(R.id.tvDaysLeft)
        progressLoan        = findViewById(R.id.progressLoan)
        tvProgress          = findViewById(R.id.tvProgress)
        tvWarning           = findViewById(R.id.tvWarning)
        btnSignOut          = findViewById(R.id.btnSignOut)
        loadingIndicator    = findViewById(R.id.loadingIndicator)
    }

    private fun setupListeners() {
        btnLogin.setOnClickListener {
            val account = etAccountNumber.text.toString().trim()
            if (account.isEmpty()) {
                showLoginError("Enter your account number (National ID)")
                return@setOnClickListener
            }
            performLogin(account)
        }

        btnSignOut.setOnClickListener {
            prefs.clearCustomer()
            showLogin()
        }
    }

    // ─── Login ────────────────────────────────────────────────────────────────
    private fun performLogin(accountNumber: String) {
        setLoginLoading(true)
        tvLoginError.visibility = View.GONE

        lifecycleScope.launch {
            val deviceId = prefs.deviceId
            val result = SupabaseClient.signInWithAccountNumber(accountNumber, deviceId ?: "")

            runOnUiThread {
                setLoginLoading(false)
                result.onSuccess { customer ->
                    // Save session
                    prefs.customerId    = customer.id
                    prefs.accountNumber = customer.account_number
                    prefs.customerName  = customer.full_name

                    // Mark device enrolled and link to customer
                    if (deviceId != null) {
                        lifecycleScope.launch {
                            val androidId = android.provider.Settings.Secure.getString(
                                contentResolver,
                                android.provider.Settings.Secure.ANDROID_ID
                            )
                            SupabaseClient.markDeviceEnrolled(deviceId, androidId)
                        }
                    }
                    showDashboard()
                    refreshLoanData()
                }.onFailure { err ->
                    showLoginError(err.message ?: "Account not found")
                }
            }
        }
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────
    private fun refreshLoanData() {
        val customerId = prefs.customerId ?: return
        loadingIndicator.visibility = View.VISIBLE

        lifecycleScope.launch {
            val loanResult = SupabaseClient.getActiveLoan(customerId)

            runOnUiThread {
                loadingIndicator.visibility = View.GONE
                loanResult.onSuccess { loan ->
                    updateDashboard(loan)
                }.onFailure {
                    tvWarning.text = "Could not load loan data. Check your connection."
                    tvWarning.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun updateDashboard(loan: LoanInfo) {
        tvCustomerName.text  = prefs.customerName ?: "Customer"
        tvAccountNumber.text = "Account: ${prefs.accountNumber}"

        val isLocked = prefs.isLocked
        tvDeviceStatus.text = if (isLocked) "🔒 LOCKED" else "🔓 ACTIVE"
        tvDeviceStatus.setTextColor(
            if (isLocked) getColor(android.R.color.holo_red_light)
            else getColor(android.R.color.holo_green_light)
        )

        tvDailyRate.text  = "K${loan.daily_rate}/day"
        tvTotalPrice.text = "K${loan.device_price}"
        tvAmountPaid.text = "K${loan.total_paid}"
        tvBalanceDue.text = "K${"%.2f".format(loan.balance_due)}"

        // Next due
        val nextDue = loan.next_due_date
        tvNextDue.text = if (nextDue != null) {
            try {
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val display = SimpleDateFormat("EEE, d MMM yyyy", Locale.getDefault())
                display.format(sdf.parse(nextDue)!!)
            } catch (e: Exception) { nextDue }
        } else "—"

        // Progress
        val pct = if (loan.device_price > 0) ((loan.total_paid / loan.device_price) * 100).toInt() else 0
        progressLoan.progress = pct
        tvProgress.text = "$pct% paid"

        // Days left
        val daysLeft = if (loan.daily_rate > 0) (loan.balance_due / loan.daily_rate).toInt() else 0
        tvDaysLeft.text = if (daysLeft > 0) "~$daysLeft days remaining" else "Fully paid! 🎉"

        // Overdue warning
        if (loan.days_overdue > 0) {
            tvWarning.text = "⚠ Payment overdue by ${loan.days_overdue} day(s). Make a payment of at least K${loan.daily_rate} to unlock this device."
            tvWarning.visibility = View.VISIBLE
        } else {
            tvWarning.visibility = View.GONE
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    private fun showLogin() {
        loginLayout.visibility    = View.VISIBLE
        dashboardLayout.visibility = View.GONE
    }

    private fun showDashboard() {
        loginLayout.visibility    = View.GONE
        dashboardLayout.visibility = View.VISIBLE
    }

    private fun showLoginError(msg: String) {
        tvLoginError.text       = msg
        tvLoginError.visibility = View.VISIBLE
    }

    private fun setLoginLoading(loading: Boolean) {
        btnLogin.isEnabled = !loading
        btnLogin.text      = if (loading) "Signing in..." else "LOGIN"
    }
}
