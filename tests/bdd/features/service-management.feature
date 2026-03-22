@service-management
Feature: Building Service Configuration
  As a building owner
  I want to configure services for my buildings
  So that I can manage utility billing accurately

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Create a metered service
    Given I am viewing the services page for building "Tòa nhà A"
    When I click the "Thêm dịch vụ" button
    And I fill in the service form with:
      | field        | value  |
      | Tên dịch vụ   | Điện   |
      | Đơn vị       | kWh    |
      | Đơn giá      | 3500   |
      | Có đồng hồ   | Có     |
    And I submit the service form
    Then I should see a success message "Đã tạo dịch vụ"
    And the service "Điện" should appear in the service list

  @happy-path
  Scenario: Create a flat-rate service
    Given I am viewing the services page for building "Tòa nhà A"
    When I click the "Thêm dịch vụ" button
    And I fill in the service form with:
      | field        | value      |
      | Tên dịch vụ   | Internet   |
      | Đơn vị       | tháng      |
      | Đơn giá      | 100000     |
      | Có đồng hồ   | Không      |
    And I submit the service form
    Then I should see a success message "Đã tạo dịch vụ"

  @happy-path
  Scenario: Update service unit price
    Given I am viewing the services page for building "Tòa nhà A"
    And service "Điện" exists with price "3500"
    When I click edit on service "Điện"
    And I change the unit price to "4000"
    And I submit the service form
    Then I should see a success message "Đã cập nhật dịch vụ"
    And the previous price "3,500" should be displayed

  @room-service
  Scenario: Override service price for specific room
    Given I am viewing room services for room "101" in building "Tòa nhà A"
    And room "101" has service "Điện" at building price "3500"
    When I set a custom price of "3000" for "Điện"
    And I save room service overrides
    Then the effective price for "Điện" in room "101" should show "3,000"

  @room-service
  Scenario: Enable and disable room services
    Given I am viewing room services for room "101" in building "Tòa nhà A"
    When I disable service "Internet" for room "101"
    And I save room service overrides
    Then service "Internet" should show as disabled for room "101"

  @negative @validation
  Scenario: Reject service with zero unit price
    Given I am viewing the services page for building "Tòa nhà A"
    When I click the "Thêm dịch vụ" button
    And I fill in service unit price "0"
    And I submit the service form
    Then I should see a validation error "Đơn giá phải lớn hơn 0"

  @negative @validation
  Scenario: Reject service with duplicate name
    Given I am viewing the services page for building "Tòa nhà A"
    And service "Điện" already exists
    When I click the "Thêm dịch vụ" button
    And I fill in service name "Điện"
    And I submit the service form
    Then I should see a form error "Dịch vụ đã tồn tại"
