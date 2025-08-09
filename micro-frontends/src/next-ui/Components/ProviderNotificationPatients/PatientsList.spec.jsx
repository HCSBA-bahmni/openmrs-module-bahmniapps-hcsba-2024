import React from 'react';
import { render, screen } from '@testing-library/react';
import PatientsList from './PatientsList';
import '@testing-library/jest-dom';
import { I18nProvider } from '../i18n/I18nProvider';

const mockHandleOnClick = jest.fn();

describe('PatientsList', () => {
  it('renders accordion with patients', async () => {
    const data = [
      [{
        administered_date_time: [2022, 6, 9],
        administered_drug_name: 'Drug A',
        administered_dose: '1',
        administered_dose_units: 'mg',
        administered_route: 'oral',
        date_of_birth: [1990, 0, 1], // Enero es 0 en moment.js para arrays
        gender: 'M',
        identifier: 'ID123',
        name: 'John Doe',
        patient_uuid: 'patient-1',
        visit_uuid: 'visit-1',
        medication_administration_performer_uuid: 'perf-1',
        medication_administration_uuid: 'medadmin-1'
      }]
    ];

    render(
      <I18nProvider>
        <PatientsList
          patientListWithMedications={data}
          handleOnClick={mockHandleOnClick}
        />
      </I18nProvider>
    );
    expect(await screen.findByText(/John Doe - Male/)).toBeInTheDocument();
    expect(screen.getByText(/Drug A/)).toBeInTheDocument();
  });
});
