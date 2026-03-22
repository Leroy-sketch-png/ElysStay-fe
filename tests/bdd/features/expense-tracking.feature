@expense-tracking
Feature: Expense Tracking
  As a building owner
  I want to record building expenses
  So that I can track operational costs and generate financial reports

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Record a new expense
    Given I am viewing the expenses page
    When I click the "Thêm chi phí" button
    And I fill in the expense form with:
      | field     | value                |
      | Tòa nhà   | Tòa nhà A           |
      | Danh mục  | Sửa chữa            |
      | Mô tả     | Sửa ống nước tầng 3 |
      | Số tiền   | 2000000              |
      | Ngày      | 2026-03-15           |
    And I submit the expense form
    Then I should see a success message "Đã tạo chi phí"

  @happy-path
  Scenario: Edit an existing expense
    Given I am viewing the expenses page
    And there is an expense "Sửa ống nước" for "Tòa nhà A"
    When I click edit on that expense
    And I change the expense amount to "2500000"
    And I submit the expense form
    Then I should see a success message "Đã cập nhật chi phí"

  @happy-path
  Scenario: Delete an expense
    Given I am viewing the expenses page
    And there is an expense "Chi phí test" for "Tòa nhà A"
    When I click delete on that expense
    And I confirm the deletion
    Then I should see a success message "Đã xóa chi phí"
    And the expense should not appear in the list

  @category
  Scenario Outline: Create expenses with different categories
    Given I am viewing the expenses page
    When I click the "Thêm chi phí" button
    And I select expense category "<category>"
    And I fill in expense description "<description>"
    And I fill in expense amount "<amount>"
    And I submit the expense form
    Then I should see a success message "Đã tạo chi phí"

    Examples:
      | category  | description         | amount  |
      | Sửa chữa  | Sửa điều hòa       | 1500000 |
      | Bảo trì   | Bảo trì thang máy  | 3000000 |
      | Tiện ích   | Phí internet        | 500000  |
      | Vệ sinh   | Dọn vệ sinh chung  | 800000  |
      | Bảo hiểm  | Bảo hiểm cháy nổ   | 5000000 |
      | Thuế      | Thuế TNDN           | 2000000 |
      | Quản lý   | Phí quản lý        | 1000000 |
      | Thiết bị   | Mua máy bơm mới    | 4000000 |
      | Vật tư    | Mua sơn sửa chữa   | 600000  |
      | Khác      | Chi phí phát sinh   | 300000  |

  @negative @validation
  Scenario: Reject expense with missing required fields
    Given I am viewing the expenses page
    When I click the "Thêm chi phí" button
    And I submit the expense form without filling required fields
    Then I should see a validation error "Danh mục là bắt buộc"
    And I should see a validation error "Mô tả là bắt buộc"
    And I should see a validation error "Số tiền là bắt buộc"

  @negative @validation
  Scenario: Reject expense with negative amount
    Given I am viewing the expenses page
    When I click the "Thêm chi phí" button
    And I fill in expense amount "-500000"
    And I submit the expense form
    Then I should see a validation error "Số tiền phải lớn hơn 0"

  @filtering
  Scenario: Filter expenses by building
    Given I am viewing the expenses page
    And there are expenses for multiple buildings
    When I filter expenses by building "Tòa nhà A"
    Then I should only see expenses for "Tòa nhà A"

  @filtering
  Scenario: Filter expenses by category
    Given I am viewing the expenses page
    When I filter expenses by category "Sửa chữa"
    Then I should only see expenses with category "Sửa chữa"

  @summary
  Scenario: View expense summary statistics
    Given I am viewing the expenses page
    Then I should see the total expense amount
    And I should see the expense count
