@tenant-management
Feature: Tenant Management
  As a building owner
  I want to manage tenant accounts and profiles
  So that I can track all tenants across my buildings

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Create a new tenant account
    Given I am viewing the tenants page
    When I click the "Thêm khách thuê" button
    And I fill in the tenant form with:
      | field     | value                |
      | Email     | tenant@example.com   |
      | Họ tên    | Nguyễn Văn B         |
      | Điện thoại | 0901234567          |
    And I submit the tenant form
    Then I should see a success message "Đã tạo khách thuê"
    And the tenant "Nguyễn Văn B" should appear in the tenant list

  @happy-path
  Scenario: View tenant detail page
    Given I am viewing the tenants page
    And tenant "Nguyễn Văn A" exists
    When I click on tenant "Nguyễn Văn A"
    Then I should see the tenant detail page
    And I should see tenant profile information
    And I should see tenant contract history

  @happy-path
  Scenario: Update tenant profile information
    Given I am viewing the tenant detail page for "Nguyễn Văn A"
    When I click the edit profile button
    And I fill in the profile form with:
      | field        | value             |
      | Số CCCD      | 012345678901      |
      | Ngày sinh    | 1995-06-15        |
      | Giới tính    | Nam               |
      | Địa chỉ      | 789 Hồ Gươm, HN |
    And I submit the profile form
    Then I should see a success message "Đã cập nhật hồ sơ"

  @negative @validation
  Scenario: Reject tenant creation with duplicate email
    Given I am viewing the tenants page
    And tenant with email "existing@example.com" already exists
    When I click the "Thêm khách thuê" button
    And I fill in the tenant form with:
      | field  | value                |
      | Email  | existing@example.com |
      | Họ tên | Duplicate User       |
    And I submit the tenant form
    Then I should see a form error "Email đã tồn tại"

  @negative @validation
  Scenario Outline: Validate tenant email format
    Given I am viewing the tenants page
    When I click the "Thêm khách thuê" button
    And I fill in tenant email with "<email>"
    And I submit the tenant form
    Then I should see a validation error "<error>"

    Examples:
      | email           | error                  |
      | invalid         | Email không hợp lệ     |
      | @example.com    | Email không hợp lệ     |
      | test@           | Email không hợp lệ     |
      | test@valid.com  | no error               |

  @status-management
  Scenario: Deactivate a tenant account
    Given I am viewing the tenants page
    And tenant "Nguyễn Văn C" has status "Active"
    When I click the deactivate button for tenant "Nguyễn Văn C"
    And I confirm the deactivation
    Then the tenant "Nguyễn Văn C" status should change to "Đã vô hiệu hóa"

  @status-management
  Scenario: Reactivate a deactivated tenant
    Given I am viewing the tenants page
    And tenant "Nguyễn Văn C" has status "Deactivated"
    When I click the activate button for tenant "Nguyễn Văn C"
    Then the tenant "Nguyễn Văn C" status should change to "Hoạt động"

  @search
  Scenario Outline: Search tenants by different criteria
    Given I am viewing the tenants page
    And there are multiple tenants in the system
    When I search for "<query>"
    Then I should see tenants matching "<query>" in the results

    Examples:
      | query             |
      | Nguyễn            |
      | tenant@test.com   |
      | 0901234567        |

  @negative @validation
  Scenario: Reject tenant creation without required fields
    Given I am viewing the tenants page
    When I click the "Thêm khách thuê" button
    And I submit the tenant form without filling required fields
    Then I should see a validation error "Email là bắt buộc"
    And I should see a validation error "Họ tên là bắt buộc"
