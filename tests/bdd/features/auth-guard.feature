@auth @security
Feature: Authentication and Authorization
  As the system
  I want to protect dashboard pages from unauthenticated access
  So that only authorized users can view sensitive data

  @smoke @critical
  Scenario: Unauthenticated user is redirected to login
    Given I am not logged in
    When I try to visit the dashboard page
    Then I should be redirected to the login page

  @smoke @happy-path
  Scenario: Authenticated owner can access the dashboard
    Given I am logged in as an owner
    When I visit the dashboard page
    Then I should see the dashboard content

  @authorization @negative
  Scenario: Staff user cannot access owner-only settings
    Given I am logged in as a staff member
    When I try to visit the settings page
    Then I should see an access denied message

  @authorization
  Scenario: Tenant can access their own dashboard
    Given I am logged in as a tenant
    When I visit the dashboard page
    Then I should see the tenant dashboard content

  @authorization @negative
  Scenario: Tenant cannot access building management
    Given I am logged in as a tenant
    When I try to visit the buildings page
    Then I should see an access denied message

  @authorization @negative
  Scenario: Tenant cannot access staff management
    Given I am logged in as a tenant
    When I try to visit the staff page
    Then I should see an access denied message

  @authorization
  Scenario: Staff can access assigned building rooms
    Given I am logged in as a staff member
    When I visit the rooms page
    Then I should see the rooms content

  @authorization @negative
  Scenario: Staff cannot access financial reports
    Given I am logged in as a staff member
    When I try to visit the reports page
    Then I should see an access denied message

  @authorization
  Scenario Outline: Role-based page access matrix
    Given I am logged in as a "<role>"
    When I try to visit the "<page>" page
    Then I should see "<result>"

    Examples:
      | role   | page         | result         |
      | owner  | dashboard    | dashboard      |
      | owner  | buildings    | buildings      |
      | owner  | rooms        | rooms          |
      | owner  | settings     | settings       |
      | owner  | reports/pnl  | reports        |
      | staff  | dashboard    | dashboard      |
      | staff  | rooms        | rooms          |
      | staff  | settings     | access denied  |
      | staff  | reports/pnl  | access denied  |
      | tenant | dashboard    | dashboard      |
      | tenant | buildings    | access denied  |
      | tenant | staff        | access denied  |
      | tenant | settings     | access denied  |

  @session
  Scenario: Session expiry redirects to login
    Given I am logged in as an owner
    And my session token has expired
    When I try to visit the dashboard page
    Then I should be redirected to the login page

  @security
  Scenario: Protected API calls include authorization header
    Given I am logged in as an owner
    When I visit the dashboard page
    Then API requests should include the authorization header
