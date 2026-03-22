@dashboard
Feature: Dashboard and Reports
  As a user of the system
  I want to see relevant dashboard information based on my role
  So that I can quickly understand the current state of my properties

  @smoke @owner
  Scenario: Owner sees comprehensive dashboard
    Given I am logged in as an owner
    When I visit the dashboard page
    Then I should see the following dashboard widgets:
      | widget                |
      | Tổng tòa nhà         |
      | Tổng phòng           |
      | Tỷ lệ lấp đầy       |
      | Hợp đồng sắp hết hạn|
      | Hóa đơn quá hạn      |
      | Doanh thu tháng      |

  @owner
  Scenario: Owner dashboard shows correct statistics
    Given I am logged in as an owner
    And I have 3 buildings with 50 total rooms
    And 40 rooms are occupied
    When I visit the dashboard page
    Then the occupancy rate should show "80%"
    And the total rooms should show "50"

  @staff
  Scenario: Staff sees limited dashboard
    Given I am logged in as a staff member
    When I visit the dashboard page
    Then I should see the following dashboard widgets:
      | widget                |
      | Tòa nhà phụ trách    |
      | Yêu cầu bảo trì      |
      | Chỉ số chờ nhập      |
    And I should not see owner-specific widgets

  @tenant
  Scenario: Tenant sees personal dashboard
    Given I am logged in as a tenant
    When I visit the dashboard page
    Then I should see the following dashboard widgets:
      | widget                |
      | Phòng đang thuê      |
      | Trạng thái hợp đồng  |
      | Hóa đơn chưa thanh toán|
      | Yêu cầu bảo trì đang mở|

  @reports @owner
  Scenario: Owner views P&L report
    Given I am logged in as an owner
    When I visit the P&L report page
    And I select year "2026"
    And I select building "Tòa nhà A"
    Then I should see monthly revenue and expense data
    And I should see the net cash flow for each month

  @reports @owner
  Scenario: Owner views P&L for all buildings
    Given I am logged in as an owner
    When I visit the P&L report page
    And I select year "2026"
    And I select "Tất cả tòa nhà"
    Then I should see aggregated P&L data across all buildings

  @reports @filtering
  Scenario Outline: P&L report by different years
    Given I am logged in as an owner
    When I visit the P&L report page
    And I select year "<year>"
    Then I should see P&L data for year "<year>"

    Examples:
      | year |
      | 2024 |
      | 2025 |
      | 2026 |

  @responsive
  Scenario: Dashboard adapts to different screen sizes
    Given I am logged in as an owner
    When I visit the dashboard page on a mobile viewport
    Then the dashboard widgets should stack vertically
    And the sidebar should be collapsed
