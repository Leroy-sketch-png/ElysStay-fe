@maintenance-workflow
Feature: Maintenance Issue Workflow
  As a building owner or staff member
  I want to track and resolve maintenance issues
  So that I can ensure building quality and tenant satisfaction

  Background:
    Given I am logged in as an owner

  @smoke @happy-path
  Scenario: Report a new maintenance issue
    Given I am viewing the maintenance page
    When I click the "Tạo yêu cầu" button
    And I fill in the issue form with:
      | field    | value                      |
      | Tòa nhà  | Tòa nhà A                 |
      | Phòng    | 101                        |
      | Tiêu đề  | Ống nước bị rò             |
      | Mô tả    | Ống nước phòng tắm bị rò rỉ|
    And I submit the issue form
    Then I should see a success message "Đã tạo yêu cầu"
    And the issue "Ống nước bị rò" should appear with status "Mới"

  @state-machine @happy-path
  Scenario: Progress issue from New to InProgress
    Given I am viewing the maintenance page
    And there is a new issue "Hỏng điều hòa"
    When I click on issue "Hỏng điều hòa"
    And I change the issue status to "Đang xử lý"
    Then the issue status should change to "Đang xử lý"

  @state-machine @happy-path
  Scenario: Resolve an in-progress issue
    Given I am viewing the maintenance page
    And there is an in-progress issue "Hỏng điều hòa"
    When I click on issue "Hỏng điều hòa"
    And I change the issue status to "Đã giải quyết"
    Then the issue status should change to "Đã giải quyết"

  @state-machine @happy-path
  Scenario: Close a resolved issue
    Given I am viewing the maintenance page
    And there is a resolved issue "Hỏng điều hòa"
    When I click on issue "Hỏng điều hòa"
    And I change the issue status to "Đã đóng"
    Then the issue status should change to "Đã đóng"

  @state-machine
  Scenario Outline: Issue status transition matrix
    Given I am viewing the maintenance detail page
    And the issue has status "<current_status>"
    Then the status "<target_status>" <availability>

    Examples:
      | current_status | target_status  | availability            |
      | New            | InProgress     | should be available     |
      | New            | Resolved       | should not be available |
      | New            | Closed         | should not be available |
      | InProgress     | Resolved       | should be available     |
      | InProgress     | Closed         | should not be available |
      | Resolved       | Closed         | should be available     |
      | Closed         | New            | should not be available |
      | Closed         | InProgress     | should not be available |

  @priority
  Scenario Outline: Create issues with different priority levels
    Given I am viewing the maintenance page
    When I click the "Tạo yêu cầu" button
    And I fill in the issue title "Test issue"
    And I select priority "<priority>"
    And I submit the issue form
    Then the issue should be created with priority "<display_priority>"

    Examples:
      | priority | display_priority |
      | Low      | Thấp             |
      | Medium   | Trung bình       |
      | High     | Cao              |

  @assignment
  Scenario: Assign issue to staff member
    Given I am viewing the maintenance detail page for issue "Hỏng điều hòa"
    When I click the assign button
    And I select staff member "Trần Văn Staff"
    And I confirm the assignment
    Then the issue should show assignee "Trần Văn Staff"

  @filtering
  Scenario Outline: Filter issues by status
    Given I am viewing the maintenance page
    When I filter issues by status "<status>"
    Then I should only see issues with status "<status>"

    Examples:
      | status       |
      | Mới          |
      | Đang xử lý  |
      | Đã giải quyết|
      | Đã đóng      |

  @filtering
  Scenario Outline: Filter issues by priority
    Given I am viewing the maintenance page
    When I filter issues by priority "<priority>"
    Then I should only see issues with priority "<priority>"

    Examples:
      | priority     |
      | Thấp         |
      | Trung bình   |
      | Cao          |

  @negative @validation
  Scenario: Reject issue creation without required fields
    Given I am viewing the maintenance page
    When I click the "Tạo yêu cầu" button
    And I submit the issue form without filling required fields
    Then I should see a validation error "Tiêu đề là bắt buộc"
    And I should see a validation error "Mô tả là bắt buộc"

  @tenant-reported
  Scenario: Tenant reports a maintenance issue
    Given I am logged in as a tenant
    And I am viewing the maintenance page
    When I click the "Tạo yêu cầu" button
    And I fill in the issue form with:
      | field    | value                       |
      | Tiêu đề  | Bình nóng lạnh không hoạt động|
      | Mô tả    | Bình nóng lạnh phòng tắm hỏng|
    And I submit the issue form
    Then I should see a success message "Đã tạo yêu cầu"

  # ─── Tenant submission process (c) ────────────────────────────────────────

  @tenant-reported @image-upload
  Scenario: Tenant submits a maintenance request with images
    Given I am logged in as a tenant
    And I am viewing the maintenance page
    When I click the "Tạo yêu cầu" button
    And I fill in the issue form with:
      | field    | value                           |
      | Tiêu đề  | Quạt trần bị hỏng               |
      | Mô tả    | Quạt trần phòng khách không quay|
    And I attach an image "broken-fan.jpg" of size "5MB"
    And I submit the issue form
    Then I should see a success message "Đã tạo yêu cầu"
    And the issue "Quạt trần bị hỏng" should appear with status "Mới"

  @tenant-reported @image-upload
  Scenario: Tenant can attach up to 3 images to a request
    Given I am logged in as a tenant
    And I am viewing the maintenance page
    When I click the "Tạo yêu cầu" button
    And I fill in the issue title "Hỏng đèn phòng ngủ"
    And I fill in the issue description "Đèn phòng ngủ không sáng"
    And I attach images:
      | filename    | size |
      | img1.jpg    | 5MB  |
      | img2.jpg    | 5MB  |
      | img3.jpg    | 5MB  |
    And I submit the issue form
    Then I should see a success message "Đã tạo yêu cầu"

  @tenant-reported @image-upload @validation
  Scenario: Rejecting a 4th image attachment
    Given I am logged in as a tenant
    And I am viewing the maintenance page
    When I click the "Tạo yêu cầu" button
    And I have already attached 3 images
    Then the image attachment button is disabled
    And I should see the message "Chỉ được đính kèm tối đa 3 ảnh"

  @tenant-reported @image-upload @validation
  Scenario: Rejecting an image that exceeds 30MB
    Given I am logged in as a tenant
    And I am viewing the maintenance page
    When I click the "Tạo yêu cầu" button
    And I attach an image "large-photo.jpg" of size "35MB"
    Then I should see a validation error "Kích thước ảnh không được vượt quá 30MB"
    And the image is not added to the form

  # ─── Status notifications to tenant ──────────────────────────────────────

  @status-updates
  Scenario: Tenant receives notification when issue moves to In Progress
    Given I am logged in as an owner
    And there is a New maintenance issue submitted by tenant for room "101"
    When I change the issue status to "Đang xử lý"
    Then the tenant should receive a notification about the status change
    And the notification message mentions "Đang xử lý"

  @status-updates
  Scenario: Tenant receives notification when issue is resolved
    Given I am logged in as an owner
    And there is an InProgress maintenance issue submitted by tenant for room "101"
    When I change the issue status to "Đã giải quyết"
    Then the tenant should receive a notification about the status change
    And the notification message mentions "Đã giải quyết"

  @status-updates
  Scenario: Each status change generates a separate notification for the tenant
    Given I am logged in as an owner
    And there is a New maintenance issue submitted by tenant for room "201"
    When I change the issue status to "Đang xử lý"
    And I change the issue status to "Đã giải quyết"
    Then "2" notifications are sent to the tenant

  # ─── Duplicate and invalid request handling ───────────────────────────────

  @duplicate-handling
  Scenario: Duplicate request for the same room and issue is flagged
    Given there is already an open issue "Hỏng điều hòa" for room "101"
    When I am logged in as a tenant
    And I am viewing the maintenance page
    And I click the "Tạo yêu cầu" button
    And I fill in the issue form with:
      | field    | value          |
      | Tiêu đề  | Hỏng điều hòa  |
      | Mô tả    | Điều hòa hỏng  |
    And I submit the issue form
    Then I should see an error message "Đã có yêu cầu tương tự đang được xử lý"

  @duplicate-handling
  Scenario: Invalid or spam request can be closed by owner
    Given I am logged in as an owner
    And there is a New issue "Test spam request" flagged as invalid
    When I view the issue detail for "Test spam request"
    And I close the issue as invalid
    Then the issue status should change to "Đã đóng"
    And the closure reason is recorded
