import React from "react";
import { Trans, useTranslation } from "react-i18next";
import "react-dates/initialize";
import moment from "moment";
import {
  Content,
  Tile,
  Heading,
  Search,
  Dropdown,
  DatePicker,
  DatePickerInput,
} from "@carbon/react";
import "moment/locale/fr";
import { createErrorHandler } from "@openmrs/esm-framework";
import Table from "../table/referrals-table.component";
import styles from "./referrals-queue.scss";
import { getReferrals } from "./referrals-queue.resource";

export default function ReferralsQueue(props: ReferralsQueueProps) {
  const [referrals, setReferrals]: [Referral[], Function] = React.useState([]);
  const [referralTypeFilter, setReferralTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const today = moment();
  const [fromDate, setFromDate] = React.useState(moment().subtract(1, "month"));
  const [toDate, setToDate] = React.useState(today);
  const [ptQuery, setPtQuery] = React.useState("");
  const { t, i18n } = useTranslation();

  const languageMatches = i18n.language?.match(/^(en|fr|ht).*/);
  const language = (languageMatches && languageMatches[1]) || "en";

  React.useEffect(() => {
    moment.locale(language === "ht" ? "fr" : language);
  }, [language]);

  React.useEffect(() => {
    if (fromDate && toDate) {
      const sub = getReferrals({
        fromDate: fromDate.format("YYYY-MM-DD"),
        toDate: toDate.format("YYYY-MM-DD"),
        locale: language,
      }).subscribe(
        (referrals) => setReferrals(referrals),
        createErrorHandler()
      );
      return () => sub.unsubscribe();
    }
  }, [fromDate, toDate, language]);

  const filteredReferrals = referrals
    .filter(
      (r) =>
        !referralTypeFilter ||
        referralTypeFilter == t("any", "Any") ||
        r.referral_type == referralTypeFilter
    )
    .filter(
      (r) =>
        !statusFilter ||
        statusFilter == t("any", "Any") ||
        r.fulfillment_status == statusFilter
    )
    .filter((r) => matchQuery(r, ptQuery));

  const referralTypes = [
    t("any", "Any"),
    ...new Set(referrals.map((r) => r.referral_type).filter((r) => r != null)),
  ];

  const statuses = [
    t("any", "Any"),
    ...new Set(
      referrals.map((r) => r.fulfillment_status).filter((r) => r != null)
    ),
  ];

  return (
    <Content className={styles.container}>
      <Tile>
        <Heading>
          <Trans i18nKey="referrals-queue">Referrals Queue</Trans>
        </Heading>
        <div className={styles.controlsContainer}>
          <div className={styles.inputContainer}>
            <DatePicker
              dateFormat="d/M/Y"
              datePickerType="range"
              locale={language === "ht" ? "fr" : language}
              maxDate={new Date().toISOString()}
              onChange={(date) => {
                if (date && date.length > 0) {
                  setFromDate(date ? moment(date[0]) : null);
                  if (date.length > 1) {
                    setToDate(date ? moment(date[1]) : null);
                  }
                }
              }}
              value={[fromDate.toISOString(), toDate.toISOString()]}
            >
              <DatePickerInput id="from-date" labelText={t("from", "From")} />
              <DatePickerInput id="to-date" labelText={t("to", "To")} />
            </DatePicker>
          </div>
          <div className={styles.inputContainer}>
            <div style={{ width: 400 }}>
              <Dropdown
                id="referral-type"
                label={t("select-referral-type", "Select Referral Type")}
                titleText={t("referral-type", "Referral Type")}
                items={referralTypes}
                onChange={(e) => setReferralTypeFilter(e.selectedItem)}
              />
            </div>
          </div>
          <div className={styles.inputContainer}>
            <div style={{ width: 400 }}>
              <label htmlFor="query-input">
                <Trans i18nKey="filter-by-patient">Filter by patient</Trans>
              </label>
              <Search
                id="query-input"
                labelText=""
                onChange={(e) => setPtQuery(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.inputContainer}>
            <div style={{ width: 400 }}>
              <Dropdown
                id="status"
                label={t("select-status", "Select Status")}
                titleText={t("status", "Status")}
                items={statuses}
                onChange={(e) => setStatusFilter(e.selectedItem)}
              />
            </div>
          </div>
        </div>
        <div className={styles.tableContainer}>
          <Table referrals={filteredReferrals} />
        </div>
      </Tile>
    </Content>
  );
}

function matchQuery(referral: Referral, query: string): boolean {
  return (
    !query ||
    prepareQuery(query).every((regexp) =>
      regexp.test(removeDiacritics(referral.patient_name))
    ) ||
    new RegExp(query, "i").test(referral.zl_emr_id)
  );
}

function prepareQuery(query: string): RegExp[] {
  return query.split(/\s/).map((token) => {
    const tokenCleaned = removeDiacritics(token);
    return new RegExp("\\b" + tokenCleaned, "i");
  });
}

function removeDiacritics(str: string) {
  // From https://stackoverflow.com/a/37511463/1464495
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

type ReferralsQueueProps = {};
