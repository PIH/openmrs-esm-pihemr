import React from 'react';
import { Document, Page, Text, Image, View, StyleSheet, Font } from '@react-pdf/renderer';
import ButaroLogo from '../images/ButaroHospitalLogo.gif';
import GeorgiaFontBold from '../Fonts/georgia/georgia-bold.ttf';
import GeorgiaFont from '../Fonts/georgia/Georgia.ttf';

Font.register({ family: 'GeorgiaBold', src: GeorgiaFontBold });
Font.register({ family: 'Georgia', src: GeorgiaFont });

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
  },
  section: {
    margin: 10,
    padding: 20,
    flexGrow: 1,
  },
  textLabels: {
    padding: 7,
    fontFamily: 'GeorgiaBold',
    fontSize: 16,
    fontWeight: 'bold',
    paddingBottom: 30,
  },
  sentenceLabels: {
    paddingTop: 7,
    fontFamily: 'GeorgiaBold',
    fontSize: 16,
    fontWeight: 'bold',
    paddingBottom: 3,
  },
  textAnswers: {
    margin: 10,
    padding: 20,
    fontFamily: 'Georgia',
    fontSize: 14,
  },
  sentenceAnswers: {
    marginBottom: 10,
    paddingBottom: 20,
    fontFamily: 'Georgia',
    fontSize: 14,
  },
  logo: {
    width: 61,
  },
});

// Create Document Component
const MyDocument = (props) => (
  <Document
    title={`Pathology report 
  ${props.encounterInfo.family_name} 
  ${props.encounterInfo.given_name}  
  ${props.encounterInfo.middle_name} `}>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Image style={styles.logo} src={ButaroLogo} />
        <Text style={{ fontSize: 8 }}>Butaro Hospital</Text>
        <Text style={{ position: 'absolute', top: 0, left: 300, width: 300 }}>
          <Text style={styles.textAnswers}>Lab phone number:</Text>
          <Text> {props.config.LabPhoneNumber}</Text>
        </Text>
        <Text style={{ position: 'absolute', top: 15, left: 300, width: 300 }}>
          <Text style={styles.textAnswers}>Accession number:</Text>
          <Text>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) => obser.concept.uuid == props.config.AccessionNumberconceptUUID && obser.value,
            )}
          </Text>
        </Text>
        <Text
          style={{
            borderBottom: '1px',
            textAlign: 'center',
            fontWeight: 1500,
            marginBottom: 30,
            fontFamily: 'GeorgiaBold',
          }}>
          Pathology Report
        </Text>
        <Text style={{ paddingBottom: 10 }}>
          <Text style={styles.textAnswers}>Patient Name:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.family_name} {props.encounterInfo.given_name} {props.encounterInfo.middle_name}
          </Text>
        </Text>
        <Text
          style={{
            paddingBottom: 10,
            position: 'absolute',
            top: 140,
            left: 335,
          }}>
          <Text style={styles.textAnswers}>Surgery Date:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) =>
                obser.concept.uuid == props.config.DateBiopsySpecimenTakenconceptUUID &&
                new Date(obser.value).toLocaleString(['en-GB', 'en-US', 'en', 'fr-RW'], {
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                }),
            )}
          </Text>
        </Text>
        <Text style={{ paddingBottom: 10 }}>
          <Text style={styles.textAnswers}>Primary care ID :</Text>
          <Text style={styles.textAnswers}> {props.encounterInfo.IMBPrimaryCare}</Text>
        </Text>
        <Text style={{ paddingBottom: 10 }}>
          <Text style={styles.textAnswers}>Patient Birthdate:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {new Date(props.encounterInfo.personBirthdate).toLocaleString(['en-GB', 'en-US', 'en', 'fr-RW'], {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </Text>
        <Text
          style={{
            paddingBottom: 10,
            position: 'absolute',
            top: 168,
            left: 335,
            width: 200,
          }}>
          <Text style={styles.textAnswers}>Specimen Reception Date:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) =>
                obser.concept.uuid == props.config.SpecimenSubmissionDateconceptUUID &&
                new Date(obser.value).toLocaleString(['en-GB', 'en-US', 'en', 'fr-RW'], {
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                }),
            )}
          </Text>
        </Text>
        <Text style={{ paddingBottom: 10, borderBottom: '1px' }}>
          <Text style={styles.textAnswers}>Patient Gender:</Text>
          <Text style={styles.textAnswers}> {props.encounterInfo.personGender}</Text>
        </Text>
        <Text
          style={{
            paddingBottom: 10,
            position: 'absolute',
            top: 200,
            left: 335,
            width: 250,
          }}>
          <Text style={styles.textAnswers}>Signout Date:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {new Date(props.encounterInfo.approvedDate).toLocaleString(['en-GB', 'en-US', 'en', 'fr-RW'], {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </Text>

        <Text style={{ paddingBottom: 10 }}>
          <Text style={styles.textLabels}>Sending Physician:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) => obser.concept.uuid == props.config.SendingPhysicianconceptUUID && obser.value,
            )}
          </Text>
        </Text>
        <Text style={{ paddingBottom: 10 }}>
          <Text style={styles.textLabels}>Sending Facility:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) => obser.concept.uuid == props.config.OtherBiopsyLocationconceptUUID && obser.value,
            )}
          </Text>
        </Text>
        <Text style={{ paddingBottom: 10, fontFamily: 'Georgia' }}>Anatomical location:</Text>
        <Text style={{ paddingBottom: 10, paddingLeft: 10 }}>
          <Text style={styles.textLabels}>i.System:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) => obser.concept.uuid == props.config.OrganSystemconceptUUID && obser.value.name.display + ',  ',
            )}
          </Text>
        </Text>
        <Text style={{ paddingBottom: 10, paddingLeft: 10 }}>
          <Text style={styles.textLabels}>ii.Organ:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) => obser.concept.uuid == props.config.OrganconceptUUID && obser.value.name.display + ',  ',
            )}
          </Text>
        </Text>
        <Text style={{ paddingBottom: 10, paddingLeft: 10 }}>
          <Text style={styles.textLabels}>iii.Detail:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) => obser.concept.uuid == props.config.SpecimenDetailconceptUUID && obser.value,
            )}
          </Text>
        </Text>
        <Text style={{ paddingBottom: 10 }}>
          <Text style={styles.textLabels}>Procedure type:</Text>
          <Text style={styles.textAnswers}>
            {' '}
            {props.encounterInfo.resultsEncounter.obs.map(
              (obser) => obser.concept.uuid == props.config.OtherTestsOrProceduresconceptUUID && obser.value,
            )}
          </Text>
        </Text>
        <Text style={[styles.sentenceLabels]}>Gross Description:</Text>
        <Text style={[styles.sentenceAnswers]}>
          {props.encounterInfo.resultsEncounter.obs.map(
            (obser) => obser.concept.uuid == props.config.GrossDescriptionconceptUUID && obser.value,
          )}
        </Text>
        <Text style={styles.sentenceLabels}>Microscopic Examination:</Text>
        <Text style={styles.sentenceAnswers}>
          {props.encounterInfo.resultsEncounter.obs.map(
            (obser) => obser.concept.uuid == props.config.MacroscopicExaminationconceptUUID && obser.value,
          )}
        </Text>
        <Text style={styles.sentenceLabels}>Conclusion:</Text>
        <Text style={styles.sentenceAnswers}>
          {props.encounterInfo.resultsEncounter.obs.map(
            (obser) =>
              obser.concept.uuid == props.config.COMMENTSATCONCLUSIONOFEXAMINATIONconceptUUID && obser.value.toString(),
          )}
        </Text>
        <Text style={styles.sentenceLabels}>Comment:</Text>
        <Text style={styles.sentenceAnswers}>
          {props.encounterInfo.resultsEncounter.obs.map(
            (obser) => obser.concept.uuid == props.config.PathologyComment && obser.value.toString(),
          )}
        </Text>

        <Text style={{ paddingBottom: 10 }}>
          <Text style={styles.textLabels}>Validated by pathologist:</Text>
          <Text style={[styles.textAnswers, { fontWeight: 'bold' }]}> {props.encounterInfo.approvedBy}</Text>
        </Text>
      </View>
    </Page>
  </Document>
);

export default MyDocument;
