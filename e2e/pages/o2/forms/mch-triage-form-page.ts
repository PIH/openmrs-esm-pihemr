import { expect } from '@playwright/test';
import { type O2VisitPage } from '../visit-page';
import { step, test } from '../../../core';

type LocationName = string;

type ReferralFrom =
  | 'Peripheral Health Unit'
  | 'CHW (Community Health Worker)'
  | 'Traditional birth attendant (TBA)'
  | 'Self-refer'
  | 'Other';
type TransportMethod = 'Ambulance' | 'Motorbike' | 'Walking' | 'Car' | 'Other';

type FormFields = {
  provider?: string;
  referralFrom?: ReferralFrom;
  transportMethod?: TransportMethod;
  disposition: { admitToWard: LocationName } | 'discharge';
};

export class MCHTriageFormPage {
  constructor(readonly o2VisitPage: O2VisitPage) {}

  @step
  async fillForm({ provider, referralFrom = 'Other', transportMethod = 'Other', disposition }: FormFields) {
    const providerName = provider ?? process.env.E2E_DEFAULT_PROVIDER_NAME;
    await test.step(`Fill the MCH Triage form with provider ${provider} and disposition ${disposition}`, async () => {
      await this.o2VisitPage.page.locator('#who select').selectOption(providerName);
      await this.o2VisitPage.page.locator('#role-refer').getByLabel(referralFrom).check();
      await this.o2VisitPage.page.locator('#transport').getByLabel(transportMethod).check();
      if (disposition === 'discharge') {
        await this.o2VisitPage.page.locator('#encounter-disposition select').selectOption('Discharge');
        return this;
      } else {
        await this.o2VisitPage.page.locator('#encounter-disposition select').selectOption('Admission');
        await this.o2VisitPage.page
          .locator('#disposition-emrapi-admittohospital-admissionlocation select')
          .selectOption(disposition.admitToWard);
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
