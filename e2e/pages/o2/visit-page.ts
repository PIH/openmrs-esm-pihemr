import { type Page } from '@playwright/test';
import { test } from '../../core';
import { type Patient, type Visit } from '@openmrs/esm-framework';
import { MaternalAdmissionFormPage } from './forms/maternal-admission-form-page';
import { MCHTriageFormPage } from './forms/mch-triage-form-page';

export class O2VisitPage {
  private constructor(readonly page: Page) {}

  readonly formsTable = () => this.page.getByRole('table', { name: /forms/i });

  static async open(page: Page, patient: Patient, visit: Visit) {
    return test.step(`Open the visit page for patient ${patient.uuid} and visit ${visit.uuid}`, async () => {
      const visitPage = new O2VisitPage(page);
      await visitPage.page.goto(
        `${process.env.E2E_BASE_URL}/pihcore/visit/visit.page?patient=${patient.uuid}&visit=${visit.uuid}`,
      );
      return visitPage;
    });
  }

  private async openForm(formName: string) {
    await this.page.locator('#visit-app').getByText(formName).click();
  }

  async openMaternalAdmissionForm() {
    await test.step(`Open the Maternal Admission form`, async () => {
      await this.openForm('Maternal Admission');
    });
    return new MaternalAdmissionFormPage(this);
  }

  async openMCHTriageForm() {
    await test.step(`Open the MCH Triage form`, async () => {
      await this.openForm('Triage');
    });
    return new MCHTriageFormPage(this);
  }
}
