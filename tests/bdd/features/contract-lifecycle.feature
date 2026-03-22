@contract-lifecycle
Feature: Contract Lifecycle
  As a building owner
  I want to manage rental contracts
  So that I can formalize tenancy agreements and track deposits

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Create a new contract
    Given I am viewing the contracts page
    When I click the "Tạo hợp đồng" button
    And I fill in the contract form with:
      | field         | value      |
      | Phòng         | 301        |
      | Khách thuê    | Nguyễn Văn A |
      | Ngày bắt đầu  | 2026-04-01 |
      | Ngày kết thúc  | 2027-03-31 |
      | Ngày nhận phòng| 2026-04-01 |
      | Tiền thuê     | 5000000    |
      | Tiền cọc      | 10000000   |
    And I submit the contract form
    Then I should see a success message "Đã tạo hợp đồng"
    And the contract should appear in the contract list

  @happy-path
  Scenario: View contract detail
    Given I am viewing the contracts page
    And there is an active contract for room "101"
    When I click on the contract for room "101"
    Then I should see the contract detail page
    And I should see contract tenant list
    And I should see deposit information

  @happy-path
  Scenario: Terminate a contract with deposit deduction
    Given I am viewing the contract detail for room "101"
    And the contract is currently active
    When I click the "Chấm dứt hợp đồng" button
    And I fill in the termination form with:
      | field         | value              |
      | Ngày chấm dứt | 2026-06-30        |
      | Ghi chú       | Hết hạn sớm       |
      | Khấu trừ      | 2000000            |
    And I submit the termination form
    Then I should see a success message "Đã chấm dứt hợp đồng"
    And the contract status should change to "Đã chấm dứt"

  @happy-path
  Scenario: Renew a contract
    Given I am viewing the contract detail for room "101"
    And the contract is currently active
    When I click the "Gia hạn hợp đồng" button
    And I fill in the renewal form with:
      | field         | value      |
      | Ngày kết thúc mới | 2028-03-31 |
      | Tiền thuê mới    | 5500000    |
    And I submit the renewal form
    Then I should see a success message "Đã gia hạn hợp đồng"

  @state-machine
  Scenario Outline: Contract status determines available actions
    Given I am viewing the contract detail for room "101"
    And the contract has status "<status>"
    Then the terminate button <terminate_avail>
    And the renew button <renew_avail>

    Examples:
      | status     | terminate_avail        | renew_avail            |
      | Active     | should be available    | should be available    |
      | Terminated | should not be available| should not be available|

  @deposit @state-machine
  Scenario Outline: Deposit status tracking through contract lifecycle
    Given I am viewing the contract detail for room "101"
    And the contract deposit has status "<deposit_status>"
    Then the deposit status should display "<display_label>"

    Examples:
      | deposit_status    | display_label      |
      | Held              | Đang giữ           |
      | PartiallyRefunded | Hoàn một phần      |
      | Refunded          | Đã hoàn            |
      | Forfeited         | Đã tịch thu        |

  @tenant-management
  Scenario: Add a co-tenant to a contract
    Given I am viewing the contract detail for room "101"
    And the contract is currently active
    When I click the "Thêm người ở" button
    And I select tenant "Trần Thị B"
    And I fill in move-in date "2026-05-01"
    And I submit the co-tenant form
    Then I should see a success message "Đã thêm người ở"
    And "Trần Thị B" should appear in the tenant list

  @tenant-management
  Scenario: Remove a co-tenant from a contract
    Given I am viewing the contract detail for room "101"
    And "Trần Thị B" is a co-tenant on the contract
    When I click remove on tenant "Trần Thị B"
    And I confirm the removal
    Then "Trần Thị B" should not appear in the tenant list

  @negative @validation
  Scenario: Reject contract creation with end date before start date
    Given I am viewing the contracts page
    When I click the "Tạo hợp đồng" button
    And I fill in the contract form with:
      | field         | value      |
      | Ngày bắt đầu  | 2026-04-01 |
      | Ngày kết thúc  | 2026-03-01 |
    And I submit the contract form
    Then I should see a validation error "Ngày kết thúc phải sau ngày bắt đầu"

  @negative @validation
  Scenario: Reject contract for room with existing active contract
    Given I am viewing the contracts page
    And room "101" already has an active contract
    When I try to create a new contract for room "101"
    Then I should see an error message "Phòng đã có hợp đồng"
