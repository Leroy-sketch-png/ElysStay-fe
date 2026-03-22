@invoice-workflow
Feature: Invoice Workflow
  As a building owner
  I want to manage invoices for my tenants
  So that I can track rent collection

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Send a draft invoice
    Given I am viewing the invoices page
    And there is a draft invoice for room "101"
    When I click the send button for that invoice
    Then the invoice status should change to "Đã gửi"
    And I should see a success message "Đã gửi hóa đơn"

  @happy-path
  Scenario: Void an overdue invoice
    Given I am viewing the invoices page
    And there is an overdue invoice for room "202"
    When I click the void button for that invoice
    And I confirm the void action
    Then the invoice status should change to "Hủy bỏ"

  @negative @state-machine
  Scenario: Cannot send an already paid invoice
    Given I am viewing the invoices page
    And there is a paid invoice for room "101"
    Then the send button should not be available for that invoice

  @state-machine
  Scenario Outline: Invoice send eligibility by status
    Given I am viewing the invoices page
    And there is a "<status>" invoice for room "101"
    Then the send button <availability> for that invoice

    Examples:
      | status        | availability           |
      | Draft         | should be available    |
      | Sent          | should not be available|
      | PartiallyPaid | should not be available|
      | Paid          | should not be available|
      | Overdue       | should not be available|
      | Void          | should not be available|

  @state-machine
  Scenario Outline: Invoice void eligibility by status
    Given I am viewing the invoices page
    And there is a "<status>" invoice for room "202"
    Then the void button <availability> for that invoice

    Examples:
      | status        | availability           |
      | Draft         | should be available    |
      | Sent          | should be available    |
      | PartiallyPaid | should be available    |
      | Paid          | should not be available|
      | Overdue       | should be available    |
      | Void          | should not be available|

  @state-machine
  Scenario Outline: Invoice payment eligibility by status
    Given I am viewing the invoices page
    And there is a "<status>" invoice for room "303"
    Then the record payment button <availability> for that invoice

    Examples:
      | status        | availability           |
      | Draft         | should not be available|
      | Sent          | should be available    |
      | PartiallyPaid | should be available    |
      | Paid          | should not be available|
      | Overdue       | should be available    |
      | Void          | should not be available|

  @happy-path
  Scenario: Record a payment for a sent invoice
    Given I am viewing the invoices page
    And there is a sent invoice for room "101" with total "5000000"
    When I click the record payment button for that invoice
    And I fill in the payment amount "5000000"
    And I select payment method "Chuyển khoản"
    And I submit the payment form
    Then I should see a success message "Đã ghi nhận thanh toán"
    And the invoice status should change to "Đã thanh toán"

  @happy-path
  Scenario: Record partial payment
    Given I am viewing the invoices page
    And there is a sent invoice for room "101" with total "5000000"
    When I click the record payment button for that invoice
    And I fill in the payment amount "2000000"
    And I submit the payment form
    Then I should see a success message "Đã ghi nhận thanh toán"
    And the invoice status should change to "Trả một phần"

  @batch
  Scenario: Generate monthly invoices for a building
    Given I am viewing the invoices page
    When I click the "Tạo hóa đơn" button
    And I select building "Tòa nhà A"
    And I select billing period "03/2026"
    And I confirm invoice generation
    Then I should see a success message "Đã tạo hóa đơn"

  @batch
  Scenario: Batch send multiple draft invoices
    Given I am viewing the invoices page
    And there are multiple draft invoices
    When I select all draft invoices
    And I click the batch send button
    And I confirm the batch send
    Then I should see a success message "Đã gửi hóa đơn"
