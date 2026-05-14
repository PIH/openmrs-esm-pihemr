import { type Page } from '@playwright/test';
import { type O2VisitPage } from '../visit-page';

type FormFields = {
  admittedTo: string;
};

export class MaternalAdmissionFormPage {
  constructor(readonly o2VisitPage: O2VisitPage) {}

  async fillForm({ admittedTo }: FormFields) {
    await this.o2VisitPage.page.locator('#where select').selectOption(admittedTo);
  }

  async save() {
    await this.o2VisitPage.page.getByRole('button', { name: 'Save' }).click();
    return this.o2VisitPage;
  }
}
