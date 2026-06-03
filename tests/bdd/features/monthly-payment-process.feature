@monthly-payment-process
Feature: Monthly Payment Process
  As a building owner
  I want to record full and partial payments for sent invoices
  So that I can track outstanding balances and mark invoices as complete

  Background:
    Given I am logged in as an owner

  # ─── Full payment ─────────────────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Full payment marks invoice as Đã thanh toán
    Given there is a Sent invoice for room "101" with total amount "5500000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    And I enter payment amount "5500000"
    And I click "Ghi nhận"
    Then the invoice status changes to "Đã thanh toán"
    And I should see a success message "Đã ghi nhận thanh toán"
    And the outstanding balance shown is "0" VND

  # ─── Partial payment ──────────────────────────────────────────────────────

  @happy-path
  Scenario: Partial payment records an outstanding balance
    Given there is a Sent invoice for room "101" with total amount "5500000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    And I enter payment amount "2000000"
    And I click "Ghi nhận"
    Then the invoice status changes to "Trả một phần"
    And I should see a success message "Đã ghi nhận thanh toán"
    And the outstanding balance shown is "3500000" VND

  @happy-path
  Scenario: Second partial payment reduces the remaining balance
    Given there is a PartiallyPaid invoice for room "101" with paid "2000000" of total "5500000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    And I enter payment amount "1500000"
    And I click "Ghi nhận"
    Then the outstanding balance shown is "2000000" VND

  @happy-path
  Scenario: Final payment after partial clears the balance and marks invoice Paid
    Given there is a PartiallyPaid invoice for room "101" with paid "3500000" of total "5500000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    And I enter payment amount "2000000"
    And I click "Ghi nhận"
    Then the invoice status changes to "Đã thanh toán"
    And the outstanding balance shown is "0" VND

  # ─── Payment method options ───────────────────────────────────────────────

  @payment-method
  Scenario: Record payment with bank transfer method
    Given there is a Sent invoice for room "101" with total amount "3000000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    And I enter payment amount "3000000"
    And I click "Ghi nhận"
    Then I should see a success message "Đã ghi nhận thanh toán"

  @payment-method
  Scenario: Record payment with cash method
    Given there is a Sent invoice for room "101" with total amount "3000000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    And I enter payment amount "3000000"
    And I click "Ghi nhận"
    Then I should see a success message "Đã ghi nhận thanh toán"

  # ─── Overdue handling ─────────────────────────────────────────────────────

  @overdue
  Scenario: Overdue invoice still allows payment recording
    Given there is an Overdue invoice for room "201" with total amount "4500000" VND
    When I open the invoice detail for room "201"
    Then the "Ghi nhận thanh toán" button is visible
    When I click "Ghi nhận thanh toán"
    And I enter payment amount "4500000"
    And I click "Ghi nhận"
    Then the invoice status changes to "Đã thanh toán"

  @overdue
  Scenario: Overdue invoice detail shows an overdue warning banner
    Given there is an Overdue invoice for room "202" with due date "2026-04-10"
    When I open the invoice detail for room "202"
    Then I should see the overdue warning "Hóa đơn đã quá hạn"

  @overdue
  Scenario: Overdue invoice is still displayed in the list with Overdue badge
    Given there is an Overdue invoice for room "303"
    When I navigate to the invoices list page
    Then the row for room "303" shows the status "Quá hạn"

  # ─── Payment status constraints ───────────────────────────────────────────

  @state-machine
  Scenario Outline: Payment is allowed only for eligible invoice statuses
    Given there is a "<status>" invoice ready for payment for room "101"
    When I open the invoice detail for room "101"
    Then the "Ghi nhận thanh toán" button <availability>

    Examples:
      | status        | availability           |
      | Sent          | is visible             |
      | Overdue       | is visible             |
      | PartiallyPaid | is visible             |
      | Draft         | is not visible         |
      | Void          | is not visible         |
      | Paid          | is not visible         |

  @state-machine
  Scenario: Cannot initiate payment on a Draft invoice
    Given there is a Draft invoice for room "101" in payment context
    When I open the invoice detail for room "101"
    Then the "Ghi nhận thanh toán" button is not visible
    And I should see the "Gửi hóa đơn" button instead

  @state-machine
  Scenario: Cannot initiate payment on a Void invoice
    Given there is a Void invoice for room "101" in payment context
    When I open the invoice detail for room "101"
    Then the "Ghi nhận thanh toán" button is not visible

  # ─── Validation ───────────────────────────────────────────────────────────

  @validation
  Scenario: Payment amount cannot be zero
    Given there is a Sent invoice for room "101" with total amount "5000000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    And I enter payment amount "0"
    And I click "Ghi nhận"
    Then I should see a validation error "Số tiền phải lớn hơn 0"

  @validation
  Scenario: Payment amount cannot exceed the remaining balance
    Given there is a Sent invoice for room "101" with total amount "3000000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    And I enter payment amount "5000000"
    And I click "Ghi nhận"
    Then I should see a validation error "Số tiền vượt quá số dư còn lại"

  @validation
  Scenario: Payment form pre-fills the exact remaining balance amount
    Given there is a Sent invoice for room "101" with total amount "4200000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    Then the payment amount field shows "4200000" by default

  @validation
  Scenario: Payment form pre-fills the outstanding balance after partial payment
    Given there is a PartiallyPaid invoice for room "101" with paid "1500000" of total "4200000" VND
    When I open the invoice detail for room "101"
    And I click "Ghi nhận thanh toán"
    Then the payment amount field shows "2700000" by default

  # ─── Payment history ──────────────────────────────────────────────────────

  @payment-history
  Scenario: Invoice detail page shows a payment history section
    Given there is a PartiallyPaid invoice for room "101" with paid "2000000" of total "5000000" VND
    When I open the invoice detail for room "101"
    Then I should see the payment history section
    And the payment history shows "1" payment of "2000000" VND

  @payment-history
  Scenario: Multiple payments are all listed in payment history
    Given there is a PartiallyPaid invoice for room "101" with two payments of "1000000" each
    When I open the invoice detail for room "101"
    Then the payment history shows "2" entries
