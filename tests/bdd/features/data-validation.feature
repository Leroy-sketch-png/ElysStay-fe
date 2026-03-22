@cross-cutting @data-validation
Feature: Cross-Cutting Data Validation
  As a system
  I want to enforce consistent validation rules across all forms
  So that data integrity is maintained throughout the application

  Background:
    Given I am logged in as an owner

  @required-fields
  Scenario Outline: Required field validation across entity forms
    Given I am viewing the "<entity>" creation form
    When I submit the form without filling required fields
    Then I should see a validation error for "<field>"

    Examples:
      | entity       | field              |
      | building     | Tên tòa nhà        |
      | building     | Địa chỉ            |
      | room         | Số phòng           |
      | tenant       | Email              |
      | tenant       | Họ tên             |
      | staff        | Email              |
      | staff        | Họ tên             |
      | staff        | Mật khẩu          |
      | contract     | Phòng              |
      | contract     | Khách thuê         |
      | contract     | Ngày bắt đầu       |
      | contract     | Ngày kết thúc       |
      | expense      | Danh mục           |
      | expense      | Mô tả              |
      | expense      | Số tiền            |
      | issue        | Tiêu đề            |
      | issue        | Mô tả              |
      | service      | Tên dịch vụ        |
      | service      | Đơn vị             |
      | service      | Đơn giá            |

  @positive-numbers
  Scenario Outline: Positive number validation across forms
    Given I am viewing the "<entity>" creation form
    When I enter "<value>" in the "<field>" field
    And I submit the form
    Then I should see a validation error "<error>"

    Examples:
      | entity   | field     | value | error                    |
      | room     | Giá       | -1    | Giá phải lớn hơn 0       |
      | room     | Diện tích | 0     | Diện tích phải lớn hơn 0 |
      | room     | Sức chứa  | -5    | Sức chứa phải lớn hơn 0  |
      | expense  | Số tiền   | -100  | Số tiền phải lớn hơn 0   |
      | service  | Đơn giá   | 0     | Đơn giá phải lớn hơn 0   |
      | contract | Tiền thuê | -1    | Tiền thuê phải lớn hơn 0  |
      | contract | Tiền cọc  | -1    | Tiền cọc phải lớn hơn 0   |

  @date-validation
  Scenario Outline: Date range validation
    Given I am viewing the "<entity>" creation form
    When I set start date to "<start>" and end date to "<end>"
    And I submit the form
    Then I should see a validation error "<error>"

    Examples:
      | entity   | start      | end        | error                           |
      | contract | 2026-04-01 | 2026-03-01 | Ngày kết thúc phải sau ngày bắt đầu |
      | contract | 2026-04-01 | 2026-04-01 | Ngày kết thúc phải sau ngày bắt đầu |

  @email-validation
  Scenario Outline: Email format validation across forms
    Given I am viewing the "<entity>" creation form
    When I enter "<email>" in the email field
    And I submit the form
    Then I should see a validation error "Email không hợp lệ"

    Examples:
      | entity  | email          |
      | tenant  | invalid-email  |
      | tenant  | @example.com   |
      | tenant  | test@          |
      | staff   | invalid-email  |
      | staff   | @example.com   |
      | staff   | test@          |

  @server-validation
  Scenario Outline: Server-side unique constraint violations
    Given I am viewing the "<entity>" creation form
    And a "<entity>" with "<field>" "<value>" already exists
    When I fill in "<field>" with "<value>"
    And I submit the form
    Then I should see a form error "<error>"

    Examples:
      | entity   | field      | value            | error                |
      | building | tên        | Tòa nhà A        | Tòa nhà đã tồn tại  |
      | tenant   | email      | dup@example.com  | Email đã tồn tại    |
      | staff    | email      | dup@example.com  | Email đã tồn tại    |
      | room     | số phòng   | 101              | Phòng đã tồn tại    |
      | service  | tên        | Điện             | Dịch vụ đã tồn tại  |

  @pagination
  Scenario Outline: Pagination across list pages
    Given I am viewing the "<page>" page
    And there are more than 20 records
    Then I should see pagination controls
    And the default page size should be 20

    Examples:
      | page          |
      | rooms         |
      | tenants       |
      | contracts     |
      | invoices      |
      | payments      |
      | expenses      |
      | reservations  |
      | maintenance   |
      | notifications |
