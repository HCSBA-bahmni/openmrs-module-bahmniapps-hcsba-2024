import React from "react";
import { render, screen } from "@testing-library/react";
import SaveAndCloseButtons from "./SaveAndCloseButtons.jsx";
import { IntlProvider } from 'react-intl';

describe("SaveAndCloseButtons", () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const renderWithIntl = (ui) => render(<IntlProvider locale="en">{ui}</IntlProvider>);

    it("should render the component", () => {
        renderWithIntl(<SaveAndCloseButtons onSave={onSave} onClose={onClose} isSaveDisabled={false} />);
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    });

    it("should render the component with disabled save button", () => {
        renderWithIntl(<SaveAndCloseButtons onSave={onSave} onClose={onClose} isSaveDisabled={true} />);
        const saveButton = screen.getByRole('button', { name: /Save/i });
        expect(saveButton).toBeDisabled();
    });

    it('should call onSave when save button is clicked', () => {
        renderWithIntl(<SaveAndCloseButtons onSave={onSave} onClose={onClose} isSaveDisabled={false} />);
        const saveButton = screen.getByRole('button', { name: /Save/i });
        saveButton.click();
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is clicked', () => {
        renderWithIntl(<SaveAndCloseButtons onSave={onSave} onClose={onClose} isSaveDisabled={false} />);
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        cancelButton.click();
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
