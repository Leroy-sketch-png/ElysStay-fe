@reservation-lifecycle
Feature: Reservation Status Transitions
  As a building owner
  I want to manage reservation lifecycles
  So that I can properly track room booking progress

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Confirm a pending reservation
    Given I am viewing the reservations page
    And there is a pending reservation for room "101"
    When I click the confirm button for that reservation
    Then the reservation status should change to "Đã xác nhận"

  @happy-path
  Scenario: Cancel a confirmed reservation
    Given I am viewing the reservations page
    And there is a confirmed reservation for room "202"
    When I click the cancel button for that reservation
    And I confirm the cancellation
    Then the reservation status should change to "Đã hủy"

  @negative @state-machine
  Scenario: Cannot confirm an expired reservation
    Given I am viewing the reservations page
    And there is an expired reservation for room "303"
    Then the confirm button should not be available for that reservation

  @state-machine
  Scenario Outline: Reservation confirm eligibility by status
    Given I am viewing the reservations page
    And there is a "<status>" reservation for room "101"
    Then the confirm button <availability> for that reservation

    Examples:
      | status    | availability            |
      | Pending   | should be available     |
      | Confirmed | should not be available |
      | Converted | should not be available |
      | Cancelled | should not be available |
      | Expired   | should not be available |

  @state-machine
  Scenario Outline: Reservation cancel eligibility by status
    Given I am viewing the reservations page
    And there is a "<status>" reservation for room "202"
    Then the cancel button <availability> for that reservation

    Examples:
      | status    | availability            |
      | Pending   | should be available     |
      | Confirmed | should be available     |
      | Converted | should not be available |
      | Cancelled | should not be available |
      | Expired   | should not be available |

  @state-machine
  Scenario Outline: Reservation conversion eligibility by status
    Given I am viewing the reservations page
    And there is a "<status>" reservation for room "303"
    Then the convert to contract button <availability> for that reservation

    Examples:
      | status    | availability            |
      | Pending   | should not be available |
      | Confirmed | should be available     |
      | Converted | should not be available |
      | Cancelled | should not be available |
      | Expired   | should not be available |

  @happy-path
  Scenario: Convert confirmed reservation to contract
    Given I am viewing the reservations page
    And there is a confirmed reservation for room "101"
    When I click the convert to contract button for that reservation
    And I fill in the contract details:
      | field       | value      |
      | Ngày bắt đầu | 2026-04-01 |
      | Ngày kết thúc | 2027-03-31 |
      | Tiền thuê     | 5000000    |
      | Tiền cọc      | 10000000   |
    And I submit the contract form
    Then the reservation status should change to "Đã chuyển đổi"
    And I should see a success message "Đã tạo hợp đồng"

  @happy-path
  Scenario: Create a new reservation
    Given I am viewing the reservations page
    When I click the "Tạo đặt phòng" button
    And I select room "301" for building "Tòa nhà A"
    And I select tenant "Nguyễn Văn A"
    And I fill in the reservation deposit "5000000"
    And I submit the reservation form
    Then I should see a success message "Đã tạo đặt phòng"

  @negative
  Scenario: Cannot create reservation for occupied room
    Given I am viewing the reservations page
    And room "101" is currently occupied
    When I try to create a reservation for room "101"
    Then I should see an error message "Phòng không khả dụng"

  @cancel-with-refund
  Scenario: Cancel reservation with deposit refund
    Given I am viewing the reservations page
    And there is a confirmed reservation for room "101" with deposit "5000000"
    When I click the cancel button for that reservation
    And I fill in the refund amount "5000000"
    And I fill in the refund note "Hoàn cọc theo yêu cầu"
    And I confirm the cancellation
    Then the reservation status should change to "Đã hủy"
    And the refund amount should be "5,000,000"
