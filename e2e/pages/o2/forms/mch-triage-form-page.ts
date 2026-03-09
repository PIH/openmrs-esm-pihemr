import { expect } from '@playwright/test';
import { type O2VisitPage } from '../visit-page';
import { step, test } from '../../../core';

type LocationName = string;

type FormFields = {
  provider?: string;
  disposition: { admitToWard: LocationName } | 'discharge';
};

export class MCHTriageFormPage {
  constructor(readonly o2VisitPage: O2VisitPage) {}

  @step
  async fillForm({ provider = 'Account, Testing', disposition }: FormFields) {
    await test.step(`Fill the MCH Triage form with provider ${provider} and disposition ${disposition}`, async () => {
      await this.o2VisitPage.page.locator('select[name="w1"]').selectOption(provider);
      if (disposition === 'discharge') {
        await this.o2VisitPage.page.locator('select[name="w124"]').selectOption('Discharge');
        return this;
      } else {
        await this.o2VisitPage.page.locator('select[name="w124"]').selectOption('Admission');
        await this.o2VisitPage.page.locator('select[name="w126"]').selectOption(disposition.admitToWard);
      }
    });
  }

  @step
  async save() {
    await test.step(`Save the MCH Triage form`, async () => {
      await this.o2VisitPage.page.getByRole('button', { name: 'Save' }).click();
      return this.o2VisitPage;
    });
  }

  @step
  async expectSuccessToast(patientName: string) {
    await test.step('Then I should see success toast', async () => {
      await expect(this.o2VisitPage.page.getByText('Entered MCOE Triage for ' + patientName)).toBeVisible();
    });
  }
}
