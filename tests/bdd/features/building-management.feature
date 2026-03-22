@building-management
Feature: Building Management
  As a building owner
  I want to manage my rental buildings
  So that I can organize my property portfolio

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Create a new building
    Given I am viewing the buildings page
    When I click the "Thêm tòa nhà" button
    And I fill in the building form with:
      | field       | value                  |
      | Tên         | Tòa nhà Sunrise        |
      | Địa chỉ     | 123 Nguyễn Huệ, Q1    |
      | Mô tả       | Tòa nhà cao cấp       |
      | Số tầng     | 10                     |
      | Ngày đến hạn | 10                    |
    And I submit the building form
    Then I should see a success message "Đã tạo tòa nhà"
    And the building "Tòa nhà Sunrise" should appear in the building list

  @happy-path
  Scenario: Edit building information
    Given I am viewing the buildings page
    And building "Tòa nhà A" exists
    When I click edit on building "Tòa nhà A"
    And I change the building name to "Tòa nhà A - Premium"
    And I submit the building form
    Then I should see a success message "Đã cập nhật tòa nhà"

  @happy-path
  Scenario: View building detail page
    Given I am viewing the buildings page
    When I click on building "Tòa nhà A"
    Then I should see the building detail page
    And I should see building statistics
    And I should see the occupancy rate

  @negative @validation
  Scenario: Reject building creation without required fields
    Given I am viewing the buildings page
    When I click the "Thêm tòa nhà" button
    And I submit the building form without filling required fields
    Then I should see a validation error "Tên tòa nhà là bắt buộc"
    And I should see a validation error "Địa chỉ là bắt buộc"

  @negative @validation
  Scenario: Reject building with duplicate name
    Given I am viewing the buildings page
    And building "Tòa nhà A" already exists
    When I click the "Thêm tòa nhà" button
    And I fill in the building form with:
      | field   | value      |
      | Tên     | Tòa nhà A  |
      | Địa chỉ | 456 Lê Lợi |
      | Số tầng | 5          |
    And I submit the building form
    Then I should see a form error "Tòa nhà đã tồn tại"

  @boundary @validation
  Scenario Outline: Validate building floor count boundaries
    Given I am viewing the buildings page
    When I click the "Thêm tòa nhà" button
    And I fill in building floors with "<floors>"
    And I submit the building form
    Then I should see "<result>"

    Examples:
      | floors | result                    |
      | 0      | Số tầng phải lớn hơn 0    |
      | -1     | Số tầng phải lớn hơn 0    |
      | 1      | success                   |
      | 100    | success                   |

  @boundary @validation
  Scenario Outline: Validate invoice due day boundaries
    Given I am viewing the buildings page
    When I click the "Thêm tòa nhà" button
    And I fill in invoice due day with "<day>"
    And I submit the building form
    Then I should see "<result>"

    Examples:
      | day | result                               |
      | 0   | Ngày đến hạn phải từ 1 đến 28        |
      | 29  | Ngày đến hạn phải từ 1 đến 28        |
      | 1   | success                              |
      | 28  | success                              |
      | 10  | success                              |

  @soft-delete
  Scenario: Delete a building
    Given I am viewing the buildings page
    And building "Tòa nhà Test" exists with no active contracts
    When I click delete on building "Tòa nhà Test"
    And I confirm the deletion
    Then the building "Tòa nhà Test" should not appear in the building list
    And I should see a success message "Đã xóa tòa nhà"
