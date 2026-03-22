@notification
Feature: Notification System
  As a user of the system
  I want to receive and manage notifications
  So that I stay informed about important events

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: View unread notifications
    Given I have unread notifications
    When I click the notification bell
    Then I should see the notification dropdown
    And I should see the unread notification count

  @happy-path
  Scenario: Mark notification as read
    Given I have an unread notification "Hóa đơn quá hạn - Phòng 101"
    When I click on that notification
    Then the notification should be marked as read
    And the unread count should decrease by 1

  @happy-path
  Scenario: Mark all notifications as read
    Given I have multiple unread notifications
    When I click the notification bell
    And I click "Đánh dấu tất cả đã đọc"
    Then all notifications should be marked as read
    And the unread count should show 0

  @navigation
  Scenario Outline: Notification click navigates to relevant page
    Given I have a notification of type "<type>" for reference "<ref_id>"
    When I click on that notification
    Then I should be navigated to "<target_page>"

    Examples:
      | type               | ref_id    | target_page              |
      | INVOICE_SENT       | inv-1     | /billing/invoices/inv-1  |
      | INVOICE_OVERDUE    | inv-2     | /billing/invoices/inv-2  |
      | INVOICE_VOIDED     | inv-3     | /billing/invoices/inv-3  |
      | PAYMENT_RECORDED   | inv-4     | /billing/invoices/inv-4  |
      | ISSUE              | issue-1   | /maintenance/issue-1     |
      | CONTRACT_CREATED   | cont-1    | /contracts/cont-1        |
      | CONTRACT_RENEWED   | cont-2    | /contracts/cont-2        |
      | CONTRACT_TERMINATED| cont-3    | /contracts/cont-3        |
      | CONTRACT_EXPIRY_ALERT | cont-4 | /contracts/cont-4        |
      | RESERVATION_EXPIRED| res-1     | /reservations            |

  @notification-page
  Scenario: View all notifications on dedicated page
    Given I am viewing the notifications page
    Then I should see a list of all notifications
    And notifications should be sorted by date descending

  @notification-page
  Scenario: Empty notification state
    Given I have no notifications
    When I visit the notifications page
    Then I should see an empty state message "Không có thông báo"
