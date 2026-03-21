Feature: Room Management
  As a building owner
  I want to manage rooms in my buildings
  So that I can track available rental spaces

  Background:
    Given I am logged in as an owner

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

  Scenario: Validate required fields on room form
    Given I am viewing the rooms page for building "Tòa nhà A"
    When I click the "Thêm phòng" button
    And I clear the room number field
    And I submit the room form
    Then I should see a validation error "Số phòng là bắt buộc"
