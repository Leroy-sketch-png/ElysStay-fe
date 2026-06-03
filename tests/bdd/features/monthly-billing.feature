@monthly-billing
Feature: Monthly Billing — Automated Invoice Generation
  As a building owner
  I want the system to automatically generate monthly invoices with all charges
  So that I can send accurate bills to tenants and track revenue

  Background:
    Given I am logged in as an owner
    And there is a building "Tòa nhà A" with active contracts

  # ─── Core invoice generation ──────────────────────────────────────────────

  @smoke @happy-path
  Scenario: Generate monthly invoice including rent, electricity, and water
    Given building "Tòa nhà A" has an active contract for room "101"
    And room "101" has a meter reading for electricity from "100" to "250" kWh
    And room "101" has a meter reading for water from "10" to "18" m³
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then a Draft invoice is created for room "101"
    And the invoice includes a line item for "Tiền thuê"
    And the invoice includes a line item for "Điện"
    And the invoice includes a line item for "Nước"

  @happy-path
  Scenario: Invoice is created in Draft status initially
    Given building "Tòa nhà A" has an active contract for room "102"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the invoice for room "102" has status "Nháp"
    And the invoice has not been sent to the tenant

  @happy-path
  Scenario: Owner sends a draft invoice to the tenant after review
    Given there is a Draft invoice for room "101" in building "Tòa nhà A"
    When I view the invoice detail for room "101"
    And I click "Gửi hóa đơn"
    And I confirm sending the invoice
    Then the invoice status changes to "Đã gửi"
    And I should see a success message "Đã gửi hóa đơn"

  # ─── Partial month rent calculation ───────────────────────────────────────

  @pro-rata
  Scenario: Mid-month move-in calculates rent for actual days stayed
    Given building "Tòa nhà A" has a contract for room "201" starting on "2026-05-15"
    And the monthly rent for room "201" is "6000000" VND
    And the month "05/2026" has 31 days
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the invoice for room "201" shows a pro-rated rent of "3096774" VND
    And the invoice line item description mentions the partial period

  @pro-rata
  Scenario: Move-out mid-month calculates rent for days before move-out
    Given building "Tòa nhà A" has a contract for room "202" ending on "2026-05-20"
    And the monthly rent for room "202" is "6000000" VND
    And the month "05/2026" has 31 days
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the invoice for room "202" shows a pro-rated rent of "3870968" VND

  @pro-rata
  Scenario: Full month contract charges full monthly rent
    Given building "Tòa nhà A" has a contract for room "203" active for the full month "05/2026"
    And the monthly rent for room "203" is "5000000" VND
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the invoice for room "203" shows rent of "5000000" VND

  # ─── Metered vs fixed services ────────────────────────────────────────────

  @service-calculation
  Scenario: Metered electricity is calculated as consumption × unit price
    Given room "101" has an electricity service enabled at "3500" VND per kWh
    And room "101" has a meter reading from "200" to "350" kWh for period "05/2026"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the electricity line item for room "101" has amount "525000" VND
    And the line item shows previous reading "200" and current reading "350"

  @service-calculation
  Scenario: Fixed service is calculated as quantity × unit price
    Given room "101" has a fixed "Internet" service at "200000" VND per unit
    And the quantity for "Internet" defaults to occupant count "2"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the "Internet" line item for room "101" has amount "400000" VND

  @service-calculation
  Scenario: Fixed service quantity defaults to 1 when occupant count is zero
    Given room "301" has a fixed "Vệ sinh" service at "100000" VND per unit
    And room "301" has "0" registered occupants
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the "Vệ sinh" line item for room "301" has quantity "1"

  # ─── Unit price priority rules ────────────────────────────────────────────

  @priority-rules
  Scenario: Room-level override price takes precedence over building default price
    Given the building default price for electricity is "3500" VND per kWh
    And room "101" has an override price of "4000" VND per kWh for electricity
    And room "101" consumed "100" kWh in "05/2026"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the electricity line item for room "101" has amount "400000" VND

  @priority-rules
  Scenario: Building default price is used when no room override exists
    Given the building default price for electricity is "3500" VND per kWh
    And room "102" has no override price for electricity
    And room "102" consumed "100" kWh in "05/2026"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the electricity line item for room "102" has amount "350000" VND

  @priority-rules
  Scenario: OverrideQuantity is used when set for a fixed service
    Given room "101" has a fixed "Đỗ xe" service with building default quantity "1"
    And room "101" has an override quantity of "2" for "Đỗ xe"
    And the unit price for "Đỗ xe" is "200000" VND
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the "Đỗ xe" line item for room "101" has quantity "2" and amount "400000" VND

  # ─── Price change tracking ────────────────────────────────────────────────

  @price-audit
  Scenario: Price increase is tracked without overwriting historical price
    Given the electricity unit price was "3000" VND per kWh in "04/2026"
    And an invoice was generated for room "101" in "04/2026" at that price
    When the electricity unit price is updated to "3500" VND per kWh
    Then the new price is applied from the next billing period
    And the old invoice for "04/2026" still shows "3000" VND per kWh
    And the service record stores the previous price "3000" in PreviousUnitPrice
    And the price change timestamp is recorded in PriceUpdatedAt

  @price-audit
  Scenario: Viewing a historical invoice always shows the price at time of creation
    Given electricity was "3300" VND per kWh when invoice for "02/2026" was created
    And the rate has since been updated to "4000" VND per kWh
    When I view the invoice for room "101" for period "02/2026"
    Then the electricity unit price shown is "3300" VND

  # ─── Missing meter readings ────────────────────────────────────────────────

  @partial-generation
  Scenario: Invoice is generated with a warning when electricity meter reading is missing
    Given room "101" has electricity service enabled
    And there is no meter reading for room "101" electricity in period "05/2026"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then a Draft invoice is still created for room "101"
    And the invoice shows a warning "Thiếu chỉ số điện cho phòng 101"
    And the electricity line item is excluded from the total

  @partial-generation
  Scenario: Invoice is generated for other services even when one meter reading is missing
    Given room "101" has electricity and water services enabled
    And there is a meter reading for water but not for electricity in period "05/2026"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the invoice for room "101" is created (not blocked)
    And the invoice includes a water line item
    And the invoice does not include an electricity line item
    And a warning is shown for the missing electricity reading

  @partial-generation
  Scenario: Disabled service is excluded from invoice even if meter reading exists
    Given room "101" has an electricity service that is currently disabled (IsEnabled = false)
    And a meter reading exists for electricity in period "05/2026"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then the invoice does not include an electricity line item for room "101"

  # ─── Batch generation ─────────────────────────────────────────────────────

  @batch
  Scenario: Generating invoices skips rooms that already have an invoice for the period
    Given an invoice already exists for room "101" in period "05/2026"
    When I generate invoices for building "Tòa nhà A" for period "05/2026"
    Then room "101" is listed in the "skipped" results
    And no duplicate invoice is created for room "101"

  @batch
  Scenario: Generate button is disabled until a building is selected
    Given I am on the invoices page
    Then the "Tạo hóa đơn" button is disabled

  @batch
  Scenario: Generate button becomes enabled after selecting a building
    Given I am on the invoices page
    When I select building "Tòa nhà A"
    Then the "Tạo hóa đơn" button is enabled
