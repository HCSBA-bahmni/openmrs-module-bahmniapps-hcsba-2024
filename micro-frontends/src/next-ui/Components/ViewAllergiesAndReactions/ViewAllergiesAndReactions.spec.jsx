import React from "react";
import { render, screen, within } from "@testing-library/react";
import '@testing-library/jest-dom';
import { ViewAllergiesAndReactions } from './ViewAllergiesAndReactions';
import { IntlProvider } from 'react-intl';

const renderWithIntl = (ui) => render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe("ViewAllergiesAndReactions", () => {
    const allergiesMock = [
        {
            allergen: "Bee",
            reactions: ["Hives", "Itching", "Fever"],
            severity: "severe",
            provider: "Dr. John Doe"
        },
        {
            allergen: "Peanuts",
            reactions: ["Dizziness", "Fever"],
            severity: "mild",
            note: "Onset Date: 2023-10-01",
            provider: "Dr. Jane"
        }
    ];

    it('renderiza encabezados y acordeones', () => {
        renderWithIntl(<ViewAllergiesAndReactions allergies={allergiesMock}/>);
        expect(screen.getByText('Allergen')).toBeInTheDocument();
        expect(screen.getByText('Reaction(s)')).toBeInTheDocument();
        expect(screen.getByText('Severity')).toBeInTheDocument();
        const accordions = screen.getAllByTestId(/allergy-accordion-/);
        expect(accordions).toHaveLength(2);
        // Verificar contenido del primer acordeón (titulo)
        expect(within(accordions[0]).getByText('Bee')).toBeInTheDocument();
        expect(within(accordions[0]).getByText(/Hives, Itching, Fever/)).toBeInTheDocument();
        expect(within(accordions[0]).getByText(/severe/i)).toBeInTheDocument();
        // Segundo acordeón
        expect(within(accordions[1]).getByText('Peanuts')).toBeInTheDocument();
        expect(within(accordions[1]).getByText(/Dizziness, Fever/)).toBeInTheDocument();
        expect(within(accordions[1]).getByText(/mild/i)).toBeInTheDocument();
    });
});