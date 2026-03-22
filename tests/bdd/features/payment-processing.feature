@payment-processing
Feature: Payment Processing
  As a building owner
  I want to record and track payments
  So that I can manage financial transactions accurately

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Record a rent payment for an invoice
    Given I am viewing the payments page
    When I click the "Ghi nhận thanh toán" button
    And I select invoice for room "101" period "03/2026"
    And I fill in the payment form with:
      | field           | value        |
      | Số tiền         | 5000000      |
      | Phương thức     | Chuyển khoản |
      | Ghi chú         | Thanh toán tháng 3 |
    And I submit the payment form
    Then I should see a success message "Đã ghi nhận thanh toán"

  @happy-path
  Scenario: Record a deposit payment
    Given I am viewing the payments page
    When I record a deposit payment with:
      | field       | value      |
      | Loại        | Nhận cọc   |
      | Số tiền     | 10000000   |
      | Phương thức | Tiền mặt   |
    Then I should see a success message "Đã ghi nhận thanh toán"

  @happy-path
  Scenario: View payment history with summary
    Given I am viewing the payments page
    Then I should see the payment summary section
    And the payment summary should show total amount
    And the payment summary should show payment count

  @payment-type
  Scenario Outline: Record different payment types
    Given I am viewing the payments page
    When I record a payment of type "<type>"
    And I fill in the payment amount "<amount>"
    And I submit the payment form
    Then I should see a success message "Đã ghi nhận thanh toán"

    Examples:
      | type          | amount   |
      | Tiền thuê     | 5000000  |
      | Nhận cọc      | 10000000 |
      | Hoàn cọc      | 10000000 |

  @negative @validation
  Scenario: Reject payment with zero amount
    Given I am viewing the payments page
    When I click the "Ghi nhận thanh toán" button
    And I fill in the payment amount "0"
    And I submit the payment form
    Then I should see a validation error "Số tiền phải lớn hơn 0"

  @negative @validation
  Scenario: Reject payment exceeding invoice balance
    Given I am viewing the payments page
    And there is a sent invoice for room "101" with total "5000000" and paid "3000000"
    When I try to record a payment of "3000000" for that invoice
    Then I should see a validation error "Số tiền vượt quá số dư"

  @batch
  Scenario: Batch record payments for multiple invoices
    Given I am viewing the payments page
    And there are multiple unpaid invoices
    When I click the "Thanh toán hàng loạt" button
    And I select invoices for rooms "101, 201, 301"
    And I fill in payment amounts for each invoice
    And I submit the batch payment form
    Then I should see a success message "Đã ghi nhận thanh toán"

  @filtering
  Scenario Outline: Filter payments by type
    Given I am viewing the payments page
    When I filter payments by type "<type>"
    Then I should only see payments of type "<type>"

    Examples:
      | type          |
      | Tiền thuê     |
      | Nhận cọc      |
      | Hoàn cọc      |

  @filtering
  Scenario: Filter payments by date range
    Given I am viewing the payments page
    When I filter payments from "2026-03-01" to "2026-03-31"
    Then I should only see payments within that date range
