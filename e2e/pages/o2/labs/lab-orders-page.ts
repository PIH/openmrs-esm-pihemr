import { expect, type Page } from '@playwright/test';
import { type Patient } from '@openmrs/esm-framework';
import { getPatientIdentifierStr } from '../../../commands';
import { step, test } from '../../../core';

/** Status as rendered in the order table's Status column. */
export type LabOrderStatus = 'Ordered' | 'Collected' | 'Reported' | 'Not Performed' | 'Canceled' | 'Expired';

/** Aggregate status badge rendered against a patient group row. */
export type LabPatientStatus =
  | 'All Ordered'
  | 'All Collected'
  | 'All Reported'
  | 'All Not Performed'
  | 'All Canceled'
  | 'All Expired'
  | 'Mixed';

/** The Lab Status buttons offered by the record-results form. */
export type LabFulfillerStatus = 'In Progress' | 'Completed' | 'Not performed';

/**
 * Every fulfillment status the list can filter on. The page defaults to showing only Ordered +
 * Collected, and it re-queries after every save -- so without widening this, a row that reaches a
 * terminal status silently drops out of the table.
 */
const ALL_FULFILLMENT_STATUSES = [
  'AWAITING_FULFILLMENT',
  'IN_FULFILLMENT',
  'COMPLETED_FULFILLMENT',
  'UNABLE_TO_COMPLETE_FULFILLMENT',
  'EXPIRED_BEFORE_FULFILLMENT',
  'CANCELLED_BEFORE_FULFILLMENT',
];

/**
 * The lab orders worklist (pihapps labOrderList.page).
 *
 * This is a single page holding four sibling sections that are shown and hidden with jQuery; the
 * URL never changes as you move between them, so assertions key on section visibility rather than
 * on page.url(). The three data-entry sections are modelled as nested classes.
 */
export class O2LabOrdersPage {
  private constructor(readonly page: Page) {}

  // ── Sections ──────────────────────────────────────────────────────────────
  readonly viewOrdersSection = () => this.page.locator('#view-orders-section');
  readonly specimenCollectionSection = () => this.page.locator('#edit-specimen-encounter-section');
  readonly recordResultsSection = () => this.page.locator('#record-lab-results-section');
  readonly notPerformedSection = () => this.page.locator('#edit-reason-not-performed-section');

  // ── List view ─────────────────────────────────────────────────────────────
  readonly groupByOrderButton = () => this.page.locator('#group-by-order-btn');
  readonly groupByPatientButton = () => this.page.locator('#group-by-patient-btn');
  readonly addLabOrdersLink = () => this.page.getByRole('link', { name: 'Add Lab orders' });
  readonly ordersTable = () => this.page.locator('#orders-table');
  readonly patientsTable = () => this.page.locator('#patients-table');
  readonly patientFilter = () => this.page.locator('#patient-filter-display');

  /**
   * A row in "Group by: Order" mode. Rows carry no id or data attribute, so they are found by the
   * lab test name in the Lab Test column (9th cell).
   */
  orderRow(labTestName: string) {
    return this.ordersTable()
      .locator('tbody tr')
      .filter({ has: this.page.locator('td:nth-child(9)', { hasText: labTestName }) });
  }

  orderRowStatus(labTestName: string) {
    return this.orderRow(labTestName).locator('td:nth-child(8)');
  }

  patientGroupRow(patient: Patient) {
    return this.patientsTable().locator(`tr.patient-group-row[data-patient-uuid="${patient.uuid}"]`);
  }

  patientSubRow(patient: Patient, labTestName: string) {
    return this.patientsTable()
      .locator(`tr.patient-sub-row.patient-sub-row-${patient.uuid}`)
      .filter({ hasText: labTestName });
  }

  @step
  static async open(page: Page) {
    return test.step('When I navigate to the lab orders page', async () => {
      const labOrdersPage = new O2LabOrdersPage(page);
      // Deep-link every status: the page reads repeated `status` params on load, and the default
      // (Ordered + Collected) would hide any order that reached a terminal status.
      const statusParams = ALL_FULFILLMENT_STATUSES.map((status) => `status=${status}`).join('&');
      await page.goto(`${process.env.E2E_BASE_URL}/pihapps/labs/labOrderList.page?${statusParams}`);
      await expect(labOrdersPage.viewOrdersSection()).toBeVisible();
      await labOrdersPage.waitForOrdersTable();
      return labOrdersPage;
    });
  }

  /**
   * The table is cleared and repopulated with a spinner placeholder row on every refresh, so wait
   * for rows to exist and then for the spinners to be gone.
   */
  private async waitForOrdersTable() {
    await expect(this.ordersTable().locator('tbody tr')).not.toHaveCount(0);
    await expect(this.ordersTable().locator('tbody i.icon-spinner')).toHaveCount(0);
  }

  private async waitForPatientsTable() {
    await expect(this.patientsTable().locator('tbody tr')).not.toHaveCount(0);
    await expect(this.patientsTable().locator('tbody i.icon-spinner')).toHaveCount(0);
  }

  /**
   * Narrows the (global, paginated) list to one patient. Driven through the jQuery UI autocomplete
   * the way a user would: typing character by character, since fill() would not trigger it.
   */
  @step
  async filterByPatient(patient: Patient) {
    const patientIdentifier = getPatientIdentifierStr(patient);
    return test.step(`When I filter the lab orders by patient "${patientIdentifier}"`, async () => {
      await this.patientFilter().click();
      await this.patientFilter().pressSequentially(patientIdentifier);
      const suggestion = this.page.locator('ul.ui-autocomplete li').first();
      await suggestion.waitFor({ state: 'visible' });
      await suggestion.click();
      await this.waitForOrdersTable();
    });
  }

  @step
  async switchToGroupByPatient() {
    return test.step('When I switch to "Group by: Patient"', async () => {
      await this.groupByPatientButton().click();
      await expect(this.groupByPatientButton()).toHaveClass(/active/);
      await this.waitForPatientsTable();
    });
  }

  @step
  async switchToGroupByOrder() {
    return test.step('When I switch to "Group by: Order"', async () => {
      await this.groupByOrderButton().click();
      await expect(this.groupByOrderButton()).toHaveClass(/active/);
      await this.waitForOrdersTable();
    });
  }

  @step
  async expandPatientRow(patient: Patient) {
    return test.step('When I expand the patient row', async () => {
      await this.patientGroupRow(patient).locator('td:nth-child(1) span').click();
      await expect(this.patientsTable().locator(`tr.patient-sub-row-${patient.uuid}`).first()).toBeVisible();
    });
  }

  // ── Row actions ───────────────────────────────────────────────────────────
  // These are bare <i> icons with no role and no accessible name beyond `title`.

  @step
  async collectSpecimen(labTestName: string) {
    await test.step(`When I collect the specimen for "${labTestName}"`, async () => {
      await this.orderRow(labTestName).locator('i.collect-specimen-action').click();
      await expect(this.specimenCollectionSection()).toBeVisible();
    });
    return new O2LabOrdersPage.SpecimenCollectionForm(this.page, this);
  }

  /** Bulk specimen collection: the only entry point is the patient group row in patient mode. */
  @step
  async collectSpecimenForPatient(patient: Patient) {
    await test.step("When I collect specimens for all of the patient's orders", async () => {
      await this.patientGroupRow(patient).locator('i.collect-specimen-group-action').click();
      await expect(this.specimenCollectionSection()).toBeVisible();
    });
    return new O2LabOrdersPage.SpecimenCollectionForm(this.page, this);
  }

  @step
  async recordResults(labTestName: string) {
    await test.step(`When I open the results form for "${labTestName}"`, async () => {
      await this.orderRow(labTestName).locator('i.enter-results-action').click();
      await expect(this.recordResultsSection()).toBeVisible();
    });
    return new O2LabOrdersPage.RecordResultsForm(this.page, this);
  }

  @step
  async markAsNotCollected(labTestName: string) {
    await test.step(`When I mark "${labTestName}" as not collected`, async () => {
      await this.orderRow(labTestName).locator('i.mark-not-performed-action').click();
      await expect(this.notPerformedSection()).toBeVisible();
    });
    return new O2LabOrdersPage.NotPerformedForm(this.page, this);
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  @step
  async expectOrderCount(count: number) {
    return test.step(`Then I should see ${count} lab order(s) in the table`, async () => {
      await expect(this.ordersTable().locator('tbody tr')).toHaveCount(count);
    });
  }

  @step
  async expectOrderStatus(labTestName: string, status: LabOrderStatus) {
    return test.step(`Then "${labTestName}" should have status "${status}"`, async () => {
      await expect(this.orderRow(labTestName)).toBeVisible();
      await expect(this.orderRowStatus(labTestName)).toContainText(status);
    });
  }

  @step
  async expectOrderStatuses(statusesByLabTest: Record<string, LabOrderStatus>) {
    return test.step('Then I should see the expected order statuses', async () => {
      for (const [labTestName, status] of Object.entries(statusesByLabTest)) {
        await expect(this.orderRowStatus(labTestName)).toContainText(status);
      }
    });
  }

  @step
  async expectPatientStatus(patient: Patient, status: LabPatientStatus) {
    return test.step(`Then the patient's orders should show status "${status}"`, async () => {
      await expect(this.patientGroupRow(patient).locator('td:nth-child(3)')).toHaveText(status);
    });
  }

  @step
  async expectPatientSubRowStatus(patient: Patient, labTestName: string, status: LabOrderStatus) {
    return test.step(`Then "${labTestName}" should show status "${status}" under the patient`, async () => {
      await expect(this.patientSubRow(patient, labTestName).locator('td:nth-child(2)')).toContainText(status);
    });
  }

  @step
  async expectBackOnOrdersList() {
    return test.step('Then I should be back on the lab orders list', async () => {
      await expect(this.viewOrdersSection()).toBeVisible();
      await expect(this.specimenCollectionSection()).toBeHidden();
      await expect(this.recordResultsSection()).toBeHidden();
      await expect(this.notPerformedSection()).toBeHidden();
    });
  }

  // ── Sub-view: specimen collection ─────────────────────────────────────────

  static SpecimenCollectionForm = class SpecimenCollectionForm {
    constructor(
      private page: Page,
      readonly labOrdersPage: O2LabOrdersPage,
    ) {}

    private readonly section = () => this.page.locator('#specimen-encounter-section');

    readonly labIdField = () => this.page.locator('#specimen-encounter-section-lab-id-input');
    readonly specimenCollectionLocation = () =>
      this.page.locator('#specimen-encounter-section-specimen-location-picker');
    readonly saveButton = () => this.section().locator('button.confirm.action-button');
    readonly cancelButton = () => this.section().locator('button.cancel.action-button');
    readonly errors = () => this.section().locator('.errors-section');

    /** Accessible name comes from aria-label, which is the lab test's display string. */
    orderCheckbox(labTestName: string) {
      return this.section().getByRole('checkbox', { name: labTestName });
    }

    @step
    async waitUntilReady() {
      await expect(this.section().locator('.form-content-section')).toBeVisible();
      await expect(this.labIdField()).toBeVisible();
    }

    /**
     * Specimen collection date, received date and collection location are all either pre-filled or
     * optional, so the Lab ID is the only field the tests need to set.
     */
    @step
    async fillLabId(labId: string) {
      return test.step(`When I enter the lab ID "${labId}"`, async () => {
        await this.labIdField().fill(labId);
      });
    }

    @step
    async uncheckOrder(labTestName: string) {
      return test.step(`When I deselect "${labTestName}" from the specimen collection`, async () => {
        await this.orderCheckbox(labTestName).uncheck();
      });
    }

    @step
    async expectOrderSelected(labTestName: string, selected: boolean) {
      return test.step(`Then "${labTestName}" should be ${selected ? 'selected' : 'deselected'}`, async () => {
        if (selected) {
          await expect(this.orderCheckbox(labTestName)).toBeChecked();
        } else {
          await expect(this.orderCheckbox(labTestName)).not.toBeChecked();
        }
      });
    }

    @step
    async save() {
      await test.step('When I save the specimen collection', async () => {
        await this.saveButton().click();
        await expect(this.labOrdersPage.specimenCollectionSection()).toBeHidden();
      });
      return this.labOrdersPage;
    }
  };

  // ── Sub-view: record results ──────────────────────────────────────────────

  static RecordResultsForm = class RecordResultsForm {
    constructor(
      private page: Page,
      readonly labOrdersPage: O2LabOrdersPage,
    ) {}

    private readonly section = () => this.page.locator('#lab-results-section');

    readonly saveButton = () => this.section().locator('button.confirm.action-button');
    readonly cancelButton = () => this.section().locator('button.cancel.action-button');
    readonly reasonNotPerformed = () => this.section().locator('.result-field.reason-not-performed select');
    readonly errors = () => this.section().locator('.errors-section');

    /**
     * The Lab Status control is a hidden <select> rendered as a button group, so selectOption()
     * cannot drive it -- the buttons have to be clicked.
     */
    statusButton(status: LabFulfillerStatus) {
      return this.section().locator('.fulfiller-status .btn-group.select-buttons button').filter({ hasText: status });
    }

    @step
    async waitUntilReady() {
      // Save/Cancel live inside this section and don't exist until two chained GETs resolve.
      await expect(this.section().locator('.result-entry-section')).toBeVisible();
      await expect(this.saveButton()).toBeVisible();
    }

    /** Selecting a status clears the other status section's inputs, so do this first. */
    @step
    async selectStatus(status: LabFulfillerStatus) {
      return test.step(`When I set the lab status to "${status}"`, async () => {
        await this.statusButton(status).click();
        await expect(this.statusButton(status)).toHaveClass(/active/);
      });
    }

    @step
    async selectReasonNotPerformed(reason: string) {
      return test.step(`When I select the reason "${reason}"`, async () => {
        await this.reasonNotPerformed().selectOption({ label: reason });
      });
    }

    @step
    async save() {
      await test.step('When I save the lab results', async () => {
        await this.saveButton().click();
        await expect(this.labOrdersPage.recordResultsSection()).toBeHidden();
      });
      return this.labOrdersPage;
    }
  };

  // ── Sub-view: mark as not collected ───────────────────────────────────────

  static NotPerformedForm = class NotPerformedForm {
    constructor(
      private page: Page,
      readonly labOrdersPage: O2LabOrdersPage,
    ) {}

    private readonly section = () => this.page.locator('#reason-not-performed-section');

    readonly reasonSelect = () => this.section().locator('.obs-field-remove-reason select');
    readonly saveButton = () => this.section().locator('button.confirm.action-button');
    readonly cancelButton = () => this.section().locator('button.cancel.action-button');
    readonly errors = () => this.section().locator('.errors-section');

    @step
    async waitUntilReady() {
      await expect(this.section().locator('.form-content-section')).toBeVisible();
      await expect(this.reasonSelect()).toBeVisible();
    }

    @step
    async selectReason(reason: string) {
      return test.step(`When I select the reason "${reason}"`, async () => {
        await this.reasonSelect().selectOption({ label: reason });
      });
    }

    @step
    async save() {
      await test.step('When I save the not-collected reason', async () => {
        await this.saveButton().click();
        await expect(this.labOrdersPage.notPerformedSection()).toBeHidden();
      });
      return this.labOrdersPage;
    }
  };
}
