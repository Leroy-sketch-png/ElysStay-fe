@room-management
Feature: Room Management
  As a building owner
  I want to manage rooms in my buildings
  So that I can track available rental spaces

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Create a new room with valid data
    Given I am viewing the rooms page for building "Tòa nhà A"
    When I click the "Thêm phòng" button
    And I fill in the room form with:
      | field       | value   |
      | Số phòng    | 301     |
      | Tầng        | 3       |
      | Diện tích   | 25      |
      | Giá         | 5000000 |
      | Sức chứa    | 2       |
    And I submit the room form
    Then I should see a success message "Đã tạo phòng"
    And the room "301" should appear in the room list

  @negative
  Scenario: Reject room creation with duplicate room number
    Given I am viewing the rooms page for building "Tòa nhà A"
    And room "101" already exists in the building
    When I click the "Thêm phòng" button
    And I fill in the room form with:
      | field    | value |
      | Số phòng | 101   |
      | Tầng     | 1     |
      | Diện tích| 20    |
      | Giá      | 3000000 |
      | Sức chứa | 2     |
    And I submit the room form
    Then I should see a form error "Phòng 101 đã tồn tại"

  @negative @validation
  Scenario: Validate required fields on room form
    Given I am viewing the rooms page for building "Tòa nhà A"
    When I click the "Thêm phòng" button
    And I clear the room number field
    And I submit the room form
    Then I should see a validation error "Số phòng là bắt buộc"

  @happy-path
  Scenario: Edit an existing room
    Given I am viewing the rooms page for building "Tòa nhà A"
    And room "101" is displayed in the room list
    When I click edit on room "101"
    And I change the room price to "6000000"
    And I submit the room form
    Then I should see a success message "Đã cập nhật phòng"

  @state-machine
  Scenario Outline: Toggle room status between Available and Maintenance
    Given I am viewing the rooms page for building "Tòa nhà A"
    And room "101" has status "<current_status>"
    When I toggle the status of room "101"
    Then the room "101" status should change to "<new_status>"

    Examples:
      | current_status | new_status  |
      | Available      | Maintenance |
      | Maintenance    | Available   |

  @state-machine @negative
  Scenario Outline: Cannot manually toggle status of occupied or booked rooms
    Given I am viewing the rooms page for building "Tòa nhà A"
    And room "201" has status "<status>"
    Then the status toggle should not be available for room "201"

    Examples:
      | status   |
      | Booked   |
      | Occupied |

  @filtering
  Scenario Outline: Filter rooms by status
    Given I am viewing the rooms page for building "Tòa nhà A"
    When I filter rooms by status "<status>"
    Then I should only see rooms with status "<status>"

    Examples:
      | status      |
      | Available   |
      | Booked      |
      | Occupied    |
      | Maintenance |

  @boundary @validation
  Scenario Outline: Reject room creation with invalid numeric values
    Given I am viewing the rooms page for building "Tòa nhà A"
    When I click the "Thêm phòng" button
    And I fill in the room form with:
      | field       | value         |
      | Số phòng    | 999           |
      | Tầng        | <floor>       |
      | Diện tích   | <area>        |
      | Giá         | <price>       |
      | Sức chứa    | <occupants>   |
    And I submit the room form
    Then I should see a validation error "<error_message>"

    Examples:
      | floor | area | price   | occupants | error_message              |
      | 0     | 25   | 5000000 | 2         | Tầng phải lớn hơn 0       |
      | 3     | 0    | 5000000 | 2         | Diện tích phải lớn hơn 0   |
      | 3     | 25   | 0       | 2         | Giá phải lớn hơn 0         |
      | 3     | 25   | 5000000 | 0         | Sức chứa phải lớn hơn 0   |
