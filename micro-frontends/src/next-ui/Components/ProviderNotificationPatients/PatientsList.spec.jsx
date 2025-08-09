import React from 'react';
import { render } from '@testing-library/react';
import PatientsList from './PatientsList';
import '@testing-library/jest-dom';

const mockHandleOnClick = jest.fn();

describe('PatientsList', () => {
  it('renders accordion with patients', () => {
    const data = [
      [{
        administered_date_time: [2022, 6, 9],
        administered_drug_name: 'Drug A',
        administered_dose: '1',
        administered_dose_units: 'mg',
        administered_route: 'oral',
        date_of_birth: [1990, 1, 1],
        gender: 'M',
        identifier: 'ID123',
        name: 'John Doe',
        patient_uuid: 'patient-1',
        visit_uuid: 'visit-1',
        medication_administration_performer_uuid: 'perf-1',
        medication_administration_uuid: 'medadmin-1'
      }]
    ];

    const { getByText } = render(
      <PatientsList
        patientListWithMedications={data}
        handleOnClick={mockHandleOnClick}
      />
    );
    expect(getByText('John Doe')).toBeInTheDocument();
  });
});
