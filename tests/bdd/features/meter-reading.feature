@meter-reading
Feature: Meter Reading Management
  As a building owner or staff member
  I want to record utility meter readings
  So that I can accurately bill tenants for metered services

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Record meter readings for a building
    Given I am viewing the meter readings page
    And building "Tòa nhà A" has metered services
    When I select building "Tòa nhà A"
    And I select billing period "03/2026"
    And I fill in meter readings:
      | room | service | previous | current |
      | 101  | Điện    | 1000     | 1150    |
      | 101  | Nước    | 50       | 65      |
      | 201  | Điện    | 2000     | 2200    |
      | 201  | Nước    | 80       | 95      |
    And I submit the meter readings
    Then I should see a success message "Đã lưu chỉ số"

  @happy-path
  Scenario: Update an existing meter reading
    Given I am viewing the meter readings page
    And there are existing readings for "03/2026"
    When I change the current reading for room "101" service "Điện" to "1175"
    And I submit the meter readings
    Then I should see a success message "Đã lưu chỉ số"
    And the consumption for room "101" "Điện" should show "175"

  @calculation
  Scenario: Verify automatic consumption calculation
    Given I am viewing the meter readings page
    When I enter previous reading "1000" and current reading "1150"
    Then the consumption should automatically show "150"

  @negative @validation
  Scenario: Reject current reading less than previous reading
    Given I am viewing the meter readings page
    When I fill in a meter reading with:
      | room | service | previous | current |
      | 101  | Điện    | 1000     | 900     |
    And I submit the meter readings
    Then I should see a validation error "Chỉ số hiện tại phải lớn hơn chỉ số trước"

  @negative @validation
  Scenario: Reject negative meter reading values
    Given I am viewing the meter readings page
    When I fill in a meter reading with:
      | room | service | previous | current |
      | 101  | Điện    | -1       | 100     |
    And I submit the meter readings
    Then I should see a validation error "Chỉ số không thể âm"

  @bulk
  Scenario: Bulk import meter readings
    Given I am viewing the meter readings page
    And I select building "Tòa nhà A" with 20 rooms
    And I select billing period "03/2026"
    Then I should see meter reading rows for all rooms with metered services
    And previous readings should be pre-filled from last month

  @filtering
  Scenario Outline: View meter readings by period
    Given I am viewing the meter readings page
    When I select billing period "<period>"
    Then I should see meter readings for "<period>"

    Examples:
      | period  |
      | 01/2026 |
      | 02/2026 |
      | 03/2026 |
