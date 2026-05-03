package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.dto.PaymentRequest
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.PaymentScenario
import com.masterforge.masterforge_backend.model.entity.PaymentStatus
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.PaymentTransactionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.booleans.shouldBeFalse
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.element
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.of
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import java.util.UUID

/**
 * Feature: search-campaigns
 *
 * Property 17: Payment Price Display Accuracy
 * Validates: Requirement 5.1
 *
 * Property 18: Mock Payment Processing
 * Validates: Requirement 5.2
 *
 * Property 19: Successful Payment Enrollment
 * Validates: Requirement 5.4
 *
 * Property 22: Payment Scenario Simulation
 * Validates: Requirement 5.8
 *
 * ACADEMIC DISCLAIMER: All payment tests use a mock payment system for educational
 * purposes only. No real financial transactions are processed.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(MockPaymentService::class, EnrollmentService::class)
class MockPaymentServicePropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired
    lateinit var mockPaymentService: MockPaymentService

    @Autowired
    lateinit var enrollmentService: EnrollmentService

    @Autowired
    lateinit var paymentTransactionRepository: PaymentTransactionRepository

    @Autowired
    lateinit var campaignRepository: CampaignRepository

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var enrollmentRepository: CampaignEnrollmentRepository

    // Valid prices sampled from a fixed list to keep tests deterministic and fast
    private val validPrices = listOf(
        BigDecimal("0.01"), BigDecimal("1.00"), BigDecimal("5.00"),
        BigDecimal("9.99"), BigDecimal("10.00"), BigDecimal("25.00"),
        BigDecimal("49.99"), BigDecimal("50.00"), BigDecimal("99.99"),
        BigDecimal("100.00")
    )

    init {

        /**
         * Feature: search-campaigns, Property 17: Payment Price Display Accuracy
         * Validates: Requirement 5.1
         *
         * For any paid campaign with a given joinPrice, when processPayment is called
         * with that amount, the stored PaymentTransaction.amount must exactly equal
         * the campaign's joinPrice.
         */
        "Property 17: stored transaction amount exactly matches the campaign joinPrice" {
            checkAll(100, Arb.element(validPrices)) { price ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(owner = owner, joinPrice = price)

                val request = PaymentRequest(
                    campaignId = campaign.id!!,
                    userId = player.id!!,
                    amount = price,
                    mockCardLastFour = "1234",
                    simulationScenario = PaymentScenario.SUCCESS
                )

                val result = mockPaymentService.processPayment(request)

                // Property: transaction was stored
                result.transactionId.shouldNotBeNull()
                val stored = paymentTransactionRepository.findById(result.transactionId!!).orElse(null)
                stored.shouldNotBeNull()

                // Property: stored amount exactly equals the campaign's joinPrice
                stored.amount.compareTo(campaign.joinPrice) shouldBe 0
            }
        }

        /**
         * Feature: search-campaigns, Property 18: Mock Payment Processing
         * Validates: Requirement 5.2
         *
         * For any payment request, processPayment always returns a PaymentResult (never throws).
         * The returned transactionId must be non-null for any processed request.
         * A PaymentTransaction record must be saved in the repository for every call.
         */
        "Property 18: processPayment always returns a result and persists a transaction record" {
            checkAll(100, Arb.element(PaymentScenario.entries)) { scenario ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(owner = owner, joinPrice = BigDecimal("10.00"))

                val request = PaymentRequest(
                    campaignId = campaign.id!!,
                    userId = player.id!!,
                    amount = BigDecimal("10.00"),
                    mockCardLastFour = "4242",
                    simulationScenario = scenario
                )

                val countBefore = paymentTransactionRepository.count()

                // Property: processPayment never throws
                val result = mockPaymentService.processPayment(request)

                // Property: transactionId is always non-null
                result.transactionId.shouldNotBeNull()

                // Property: exactly one new transaction record was persisted
                val countAfter = paymentTransactionRepository.count()
                countAfter shouldBe countBefore + 1
            }
        }

        /**
         * Feature: search-campaigns, Property 19: Successful Payment Enrollment
         * Validates: Requirement 5.4
         *
         * For any SUCCESS scenario payment, after processPayment succeeds, calling
         * enrollmentService.enrollInPaidCampaign must succeed and the enrollment
         * record must be linked to the payment transaction.
         */
        "Property 19: successful payment followed by enrollInPaidCampaign creates a linked enrollment" {
            checkAll(100, Arb.element(validPrices)) { price ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(owner = owner, joinPrice = price)

                val request = PaymentRequest(
                    campaignId = campaign.id!!,
                    userId = player.id!!,
                    amount = price,
                    mockCardLastFour = "5678",
                    simulationScenario = PaymentScenario.SUCCESS
                )

                val paymentResult = mockPaymentService.processPayment(request)

                // Pre-condition: payment succeeded
                paymentResult.success.shouldBeTrue()
                paymentResult.transactionId.shouldNotBeNull()

                // Enroll using the transaction ID
                val enrollmentResult = enrollmentService.enrollInPaidCampaign(
                    campaignId = campaign.id!!,
                    userId = player.id!!,
                    paymentTransactionId = paymentResult.transactionId!!
                )

                // Property: enrollment succeeds
                enrollmentResult.success.shouldBeTrue()

                // Property: enrollment record is linked to the payment transaction
                val enrollment = enrollmentRepository.findByCampaignIdAndUserId(campaign.id!!, player.id!!)
                enrollment.shouldNotBeNull()
                enrollment.paymentTransactionId shouldBe paymentResult.transactionId
            }
        }

        /**
         * Feature: search-campaigns, Property 22: Payment Scenario Simulation
         * Validates: Requirement 5.8
         *
         * For each PaymentScenario value, simulatePaymentScenario returns a result
         * matching the expected outcome:
         * - SUCCESS → result.success == true, stored status == COMPLETED
         * - All others → result.success == false, stored status == FAILED
         */
        "Property 22: simulatePaymentScenario outcome matches the requested scenario" {
            checkAll(100, Arb.element(PaymentScenario.entries)) { scenario ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(owner = owner, joinPrice = BigDecimal("15.00"))

                val request = PaymentRequest(
                    campaignId = campaign.id!!,
                    userId = player.id!!,
                    amount = BigDecimal("15.00"),
                    mockCardLastFour = "9999"
                )

                val result = mockPaymentService.simulatePaymentScenario(request, scenario)

                // Property: SUCCESS → success == true; all others → success == false
                if (scenario == PaymentScenario.SUCCESS) {
                    result.success.shouldBeTrue()
                } else {
                    result.success.shouldBeFalse()
                }

                // Property: stored transaction status matches the scenario outcome
                result.transactionId.shouldNotBeNull()
                val stored = paymentTransactionRepository.findById(result.transactionId!!).orElse(null)
                stored.shouldNotBeNull()

                val expectedStatus = if (scenario == PaymentScenario.SUCCESS) {
                    PaymentStatus.COMPLETED
                } else {
                    PaymentStatus.FAILED
                }
                stored.status shouldBe expectedStatus
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun cleanup() {
        enrollmentRepository.deleteAll()
        paymentTransactionRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun saveUser(): User = userRepository.save(
        User(
            name = "User_${UUID.randomUUID()}",
            email = "user_${UUID.randomUUID()}@test.com",
            passwordHash = "hash"
        )
    )

    private fun saveCampaign(
        owner: User,
        joinPrice: BigDecimal = BigDecimal("10.00"),
        maxPlayers: Int = 4,
        visibility: CampaignVisibility = CampaignVisibility.PUBLIC
    ): Campaign = campaignRepository.save(
        Campaign(
            name = "Campaign_${UUID.randomUUID()}",
            description = "A test campaign",
            owner = owner,
            maxPlayers = maxPlayers,
            joinPrice = joinPrice,
            visibility = visibility
        )
    )
}
