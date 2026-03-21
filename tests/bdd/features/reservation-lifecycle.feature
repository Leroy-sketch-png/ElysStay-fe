Feature: Reservation Status Transitions
  As a building owner
  I want to manage reservation lifecycles
  So that I can properly track room booking progress

  Background:
    Given I am logged in as an owner

  Scenario: Confirm a pending reservation
    Given I am viewing the reservations page
    And there is a pending reservation for room "101"
    When I click the confirm button for that reservation
    Then the reservation status should change to "Đã xác nhận"

  Scenario: Cancel a confirmed reservation
    Given I am viewing the reservations page
    And there is a confirmed reservation for room "202"
    When I click the cancel button for that reservation
    And I confirm the cancellation
    Then the reservation status should change to "Đã hủy"

  Scenario: Cannot confirm an expired reservation
    Given I am viewing the reservations page
    And there is an expired reservation for room "303"
    Then the confirm button should not be available for that reservation
