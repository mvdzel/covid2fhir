const csv = require('csv-parser');
const fs = require('fs');

const currentyear = new Date().getFullYear();

fs.createReadStream('/home/michael/Downloads/latestdata.csv')
    .pipe(csv())
    .on('data', (row) => {
        procesRow(row);
    })
    .on('end', () => {
        console.log('CSV file successfully processed');
    });

var lineno = 0;
function procesRow(row) {
    lineno++;
    if (lineno > 1600) return;

    var fhir_bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [ ]
    };

    var patientId = "patient-" + lineno;
    var fhir_patient = {
        "resourceType": "Patient",
        "id": patientId,
        "identifier": [
            {
              "system": "https://github.com/beoutbreakprepared/nCoV2019/tree/master/latest_data",
              "value": row["ID"]
            }
        ],
        "gender": row["gender"],
        "address": [
          {
            "extension": [
              {
                "url": "http://hl7.org/fhir/StructureDefinition/geolocation",
                "extension": [
                  {
                    "url": "latitude",
                    "valueDecimal": parseFloat(row["latitude"])
                  },
                  {
                    "url": "longitude",
                    "valueDecimal": parseFloat(row["longitude"])
                  }
                ]
              }
            ],
            "city": row["city"],
            "state": row["province"],
            "country": row["country"]
          }
        ]
    };
    if (row["age"].match(/\d+/g)) {
        var age = parseInt(row["age"]);
        var birthYear = currentyear - age;
        fhir_patient.birthDate = `${birthYear}`;
    }
    fhir_bundle.entry.push({
        "fullUrl": `Patient/${fhir_patient.id}`,
        "resource": fhir_patient,
        "request": {
            "method": "POST",
            "url": fhir_patient.resourceType
        }
    });

    var conditionId = "condition-" + lineno;
    var fhir_condition = {
        "resourceType": "Condition",
        "id": conditionId,
        "clinicalStatus": "active",
        "verificationStatus": "confirmed",
        "code": {
            "coding": [
                {
                "system": "http://snomed.info/sct",
                "code": "840539006",
                "display": "Disease caused by 2019 novel coronavirus (disorder)"
                }
            ],
            "text": "COVID-19"
        },
        "category": [
            {
              "coding": [
                {
                  "system": "http://snomed.info/sct",
                  "code": "282291009",
                  "display": "diagnosis"
                }
              ],
              "text": "diagnosis"
            }
        ],
        "subject": {
            "reference": `Patient/${patientId}`
        }
    };
    if(row["date_confirmation"]) {
        var parts = row["date_confirmation"].split(/[\. ]/);
        var dateValue = parts[2] + '-' + parts[1] + '-' + parts[0];
        fhir_condition.onsetDateTime = dateValue;
        fhir_condition.assertedDate = dateValue;
    }
    fhir_bundle.entry.push({
        "fullUrl": `Condition/${fhir_condition.id}`,
        "resource": fhir_condition,
        "request": {
            "method": "POST",
            "url": fhir_condition.resourceType
        }
    });

    var outcome = row["outcome"];
    switch(outcome) {
        case "severe":
            // Encounter to ICU
            break;
        case "stable":
        case "discharge":
        case "discharged":
            fhir_patient.deceasedBoolean = false;
            break;
        case "recovered":
            fhir_condition.clinicalStatus = "resolved";
            fhir_patient.deceasedBoolean = false;
            break;
        case "died":
        case "death":
        case "dead":
            fhir_patient.deceasedBoolean = true;
            break;
        case "":
            break;
        default:
            console.log("UNKNOWN OUTCOME: '" + outcome + "'");
            break;
    }

    var encounterId = "encounter-" + lineno;
    var fhir_encounter = {
        "resourceType": "Encounter",
        "id": encounterId,
        "status": "in-progress",
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "AMB"
        },
        "type": [
            {
              "coding": [
                {
                  "system": "http://snomed.info/sct",
                  "code": "162673000",
                  "display": "General examination of patient (procedure)"
                }
              ],
              "text": "General examination of patient (procedure)"
            }
        ],
        "subject": {
            "reference": `Patient/${patientId}`
        },
        "period": { }
    };
    if(row["date_admission_hospital"]) {
        var parts = row["date_admission_hospital"].split(/[\. ]/);
        var dateValue = parts[2] + '-' + parts[1] + '-' + parts[0];
        fhir_encounter.period.start = dateValue;
    }
    if(row["date_death_or_discharge"]) {
        var parts = row["date_death_or_discharge"].split(/[\. ]/);
        var dateValue = parts[2] + '-' + parts[1] + '-' + parts[0];
        fhir_encounter.period.end = dateValue;
        fhir_encounter.status = "finished";

        if (fhir_patient.deceasedBoolean == true) {
            delete fhir_patient.deceasedBoolean;
            fhir_patient.deceasedDateTime = dateValue;
        }
    }
    fhir_bundle.entry.push({
        "fullUrl": `Encounter/${fhir_encounter.id}`,
        "resource": fhir_encounter,
        "request": {
            "method": "POST",
            "url": fhir_encounter.resourceType
        }
    });
    fhir_condition.context = {
        "reference": `Encounter/${encounterId}`
    }

    if (row["travel_history_location"]) {
        var observationId = "observation-" + lineno;
        var fhir_observation = {
            "resourceType": "Observation",
            "id": observationId,
            "status": "final",
            "category": [
                {
                  "coding": [
                    {
                      "system": "http://hl7.org/fhir/observation-category",
                      "code": "social-history",
                      "display": "Social History"
                    }
                  ]
                }
            ],
            "code": {
                "coding": [
                    {
                      "system": "http://snomed.info/sct",
                      "code": "443846001",
                      "display": "Detail of history of travel (observable entity)"
                    }
                  ],
                  "text": "Detail of history of travel (observable entity)"
            },
            "valueString": row["travel_history_location"]
        }
        if (row["travel_history_dates"].match(/^\d\d\.\d\d\.\d\d\d\d - \d\d\.\d\d\.\d\d\d\d$/g)) {
            var parts = row["travel_history_dates"].split(/[\. -]/);
            var startDateValue = parts[2] + '-' + parts[1] + '-' + parts[0];
            var endDateValue = parts[7] + '-' + parts[6] + '-' + parts[5];
            fhir_observation.effectivePeriod = {
                start: startDateValue,
                end: endDateValue
            };
        }
        if (row["travel_history_dates"].match(/^\d\d\.\d\d\.\d\d\d\d$/g)) {
            var parts = row["travel_history_dates"].split('.');
            var dateValue = parts[2] + '-' + parts[1] + '-' + parts[0];
            fhir_observation.effectiveDateTime = dateValue;
        }
        fhir_bundle.entry.push({
            "fullUrl": `Observation/${fhir_observation.id}`,
            "resource": fhir_observation,
            "request": {
                "method": "POST",
                "url": fhir_observation.resourceType
            }
        });
    }

    if (row["symptoms"] != "") {
        var symptoms = row["symptoms"].split(',');
        var symptomno = 0;
        symptoms.forEach(symptom => {
            var symptomId = conditionId + "-symptom-" + symptomno++;
            var fhir_symptom = {
                "resourceType": "Condition",
                "id": symptomId,
                "clinicalStatus": "active",
                "verificationStatus": "confirmed",
                "code": {
                    "text": symptom.trim()
                },
                "category": [
                    {
                    "coding": [
                        {
                        "system": "http://snomed.info/sct",
                        "code": "418799008",
                        "display": "symptom"
                        }
                    ],
                    "text": "symptom"
                    }
                ],
                "subject": {
                    "reference": `Patient/${patientId}`
                },
                "context": {
                    "reference": `Encounter/${encounterId}`
                }
            };
            if(row["date_onset_symptoms"]) {
                var parts = row["date_onset_symptoms"].split(/[\. ]/);
                var dateValue = parts[2] + '-' + parts[1] + '-' + parts[0];
                fhir_symptom.onsetDateTime = dateValue;
                fhir_symptom.assertedDate = dateValue;
            }
            fhir_bundle.entry.push({
                "fullUrl": `Condition/${fhir_symptom.id}`,
                "resource": fhir_symptom,
                "request": {
                    "method": "POST",
                    "url": fhir_symptom.resourceType
                }
            });
        });
    }
    fs.writeFile("output/" + patientId + ".json", JSON.stringify(fhir_bundle, null, 2));
};