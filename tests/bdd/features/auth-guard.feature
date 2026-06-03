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
