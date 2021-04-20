# Approach

1. Find a machine readable individual case dataset source
2. Map the CSV columns to FHIR Resources
3. Lookup and complete codings
4. Create a node.js script to convert the CSV to FHIR resources
5. Bundle (transaction) the resources per individual for easy uploading into FHIR server
5. Check the generated FHIR resources
6a. Some count queries
6b. Measure & ServiceDefinition does not seem to be implemented in HAPI yet :-(
7. Create dashboard graphs

-------------
# Source data

Source COVID-19 individual case data
<https://github.com/beoutbreakprepared/nCoV2019/tree/master/latest_data>

-------------
# Tools & Scripts

To validate the generated json Bundle of 1 case: 
> java -jar ../sample-ig/org.hl7.fhir.validator-4.1.46.jar -tx n/a -version 3.0 output/patient-115.json 

To run the transaction on the dHealthLab FHIR Server
> curl -X POST -H "Content-type: application/json" --data @output/patient-2571.json https://r3.dhealth.usor.nl/baseDstu3

Script to execute all transactions:
> for fn in `ls output`; do
>    curl -X POST -H "Content-Type: application/json" --data @output/$fn https://r3.dhealth.usor.nl/baseDstu3/
> done
--------------------------
# Query examples

Query for Conditions and Patients with COVID-19
http://r3.dhealth.usor.nl/baseDstu3/Condition?code=840539006&_include=Condition:subject

Query for Patients with Condition=COVID-19
https://r3.dhealth.usor.nl/baseDstu3/Patient?_has:Condition:subject:code=840539006

Count matches for Patients with Condition=COVID-19
https://r3.dhealth.usor.nl/baseDstu3/Patient?_has:Condition:subject:code=840539006&_summary=count

Get only the value for the travel observations
https://r3.dhealth.usor.nl/baseDstu3/Observation?code=443846001&_count=200&_elements=value

Get all the Encounters that have a period in 2020 specified
http://r3.dhealth.usor.nl/baseDstu3/Encounter?_has:Condition:subject:code=840539006&_count=100&date=2020&_elements=period
---------------
# Measure notes

http://hl7.org/fhir/STU3/measure-operations.html#data-requirements
    URL: [base]/Measure/[id]/$evaluate-measure

To get summary counts = cat3:
    URL: [base]/Measure/[id]/$evaluate-measure?reportType=population
---------------
# Dashboard libraries

http://docs.smarthealthit.org/client-js/
https://developers.google.com/chart/interactive/docs/gallery/piechart

# Logica Impl Guide
https://github.com/logicahealth/covid-19/
Symptoms valueset SCT codes
https://covid-19-ig.logicahealth.org/ValueSet-covid19-signs-1nd-symptoms-value-set.html
