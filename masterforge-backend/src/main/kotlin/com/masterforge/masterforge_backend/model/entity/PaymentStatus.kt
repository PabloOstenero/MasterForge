package com.masterforge.masterforge_backend.model.entity

/**
 * Represents the status of a mock payment transaction.
 * Used for academic demonstration of payment processing workflows.
 */
enum class PaymentStatus {
    PENDING,
    COMPLETED,
    FAILED,
    CANCELLED
}