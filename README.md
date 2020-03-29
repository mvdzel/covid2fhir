
Source COVID-19 individual case data
<https://github.com/beoutbreakprepared/nCoV2019/tree/master/latest_data>

To validate the generated json Bundle of 1 case: 
> java -jar ../sample-ig/org.hl7.fhir.validator-4.1.46.jar -tx n/a -version 3.0 output/patient-115.json 

To run the transaction on the dHealthLab FHIR Server
> curl -X POST -H "Content-type: application/json" --data @output/patient-2571.json https://r3.dhealth.usor.nl/baseDstu3

-------------
Script to execute all transactions:
> for fn in `ls output`; do
>    curl -X POST -H "Content-Type: application/json" --data @output/$fn https://r3.dhealth.usor.nl/baseDstu3/
> done
--------------------------
Query for Conditions and Patients with COVID-19
http://r3.dhealth.usor.nl/baseDstu3/Condition?code=840539006&_include=Condition:subject

Query for Patients with Condition=COVID-19
https://r3.dhealth.usor.nl/baseDstu3/Patient?_has:Condition:subject:code=840539006

Count matches for Patients with Condition=COVID-19
https://r3.dhealth.usor.nl/baseDstu3/Patient?_has:Condition:subject:code=840539006&_summary=count

---------------
Measure

http://hl7.org/fhir/STU3/measure-operations.html#data-requirements
    URL: [base]/Measure/[id]/$evaluate-measure

To get summary counts = cat3:
    URL: [base]/Measure/[id]/$evaluate-measure?reportType=population