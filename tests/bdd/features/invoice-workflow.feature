Feature: Invoice Workflow
  As a building owner
  I want to manage invoices for my tenants
  So that I can track rent collection

  Background:
    Given I am logged in as an owner

  Scenario: Send a draft invoice
    Given I am viewing the invoices page
    And there is a draft invoice for room "101"
    When I click the send button for that invoice
    Then the invoice status should change to "Đã gửi"
    And I should see a success message "Đã gửi hóa đơn"

  Scenario: Void an overdue invoice
    Given I am viewing the invoices page
    And there is an overdue invoice for room "202"
    When I click the void button for that invoice
    And I confirm the void action
    Then the invoice status should change to "Hủy bỏ"

  Scenario: Cannot send an already paid invoice
    Given I am viewing the invoices page
    And there is a paid invoice for room "101"
    Then the send button should not be available for that invoice
