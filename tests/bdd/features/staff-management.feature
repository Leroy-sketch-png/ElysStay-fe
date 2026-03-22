@staff-management
Feature: Staff Management
  As a building owner
  I want to manage staff accounts and building assignments
  So that I can delegate building management responsibilities

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Create a new staff account
    Given I am viewing the staff page
    When I click the "Thêm nhân viên" button
    And I fill in the staff form with:
      | field      | value              |
      | Email      | staff@example.com  |
      | Họ tên     | Lê Văn Staff       |
      | Điện thoại  | 0909876543        |
      | Mật khẩu   | SecurePass123!    |
    And I submit the staff form
    Then I should see a success message "Đã tạo nhân viên"
    And the staff member "Lê Văn Staff" should appear in the staff list

  @happy-path
  Scenario: Assign staff to a building
    Given I am viewing the staff page
    And staff member "Lê Văn Staff" exists
    When I click on building assignments for "Lê Văn Staff"
    And I assign them to building "Tòa nhà A"
    Then I should see a success message "Đã phân công"
    And "Tòa nhà A" should appear in their building list

  @happy-path
  Scenario: Remove staff from a building
    Given I am viewing the staff page
    And staff member "Lê Văn Staff" is assigned to "Tòa nhà A"
    When I click on building assignments for "Lê Văn Staff"
    And I remove them from building "Tòa nhà A"
    And I confirm the removal
    Then I should see a success message "Đã hủy phân công"

  @status-management
  Scenario: Deactivate a staff account
    Given I am viewing the staff page
    And staff member "Lê Văn Staff" has status "Active"
    When I click the deactivate button for "Lê Văn Staff"
    And I confirm the deactivation
    Then the staff member status should change to "Đã vô hiệu hóa"

  @status-management
  Scenario: Reactivate a staff account
    Given I am viewing the staff page
    And staff member "Lê Văn Staff" has status "Deactivated"
    When I click the activate button for "Lê Văn Staff"
    Then the staff member status should change to "Hoạt động"

  @negative @validation
  Scenario: Reject staff creation with weak password
    Given I am viewing the staff page
    When I click the "Thêm nhân viên" button
    And I fill in the staff form with:
      | field    | value              |
      | Email    | new@example.com    |
      | Họ tên   | New Staff          |
      | Mật khẩu | 123               |
    And I submit the staff form
    Then I should see a validation error "Mật khẩu phải có ít nhất 8 ký tự"

  @negative @validation
  Scenario: Reject staff creation with duplicate email
    Given I am viewing the staff page
    And staff with email "existing@example.com" already exists
    When I click the "Thêm nhân viên" button
    And I fill in the staff form with:
      | field  | value                |
      | Email  | existing@example.com |
      | Họ tên | Duplicate Staff      |
    And I submit the staff form
    Then I should see a form error "Email đã tồn tại"

  @authorization
  Scenario: Staff can only see assigned buildings
    Given I am logged in as a staff member
    And I am assigned to building "Tòa nhà A" only
    When I visit the buildings page
    Then I should only see building "Tòa nhà A"
    And I should not see building "Tòa nhà B"

  @authorization
  Scenario: Staff cannot manage other staff
    Given I am logged in as a staff member
    When I try to visit the staff page
    Then I should see an access denied message
