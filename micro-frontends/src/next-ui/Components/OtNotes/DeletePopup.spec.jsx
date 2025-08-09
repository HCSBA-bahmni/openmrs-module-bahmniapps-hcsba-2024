import React from "react";
import {render, screen} from "@testing-library/react";
import userEvent from '@testing-library/user-event';
import { DeletePopup } from "./DeletePopup";
import {I18nProvider} from "../i18n/I18nProvider";

// Mock matchMedia igual que en SavePopup
if (!window.matchMedia) {
  window.matchMedia = () => ({ matches:false, addListener: () => {}, removeListener: () => {} });
}

const mockDeletePopup = jest.fn();

jest.mock('../i18n/utils', () => ({ getLocale: () => 'en', getTranslations: () => Promise.resolve({}) }));
jest.mock("./utils", () => ({
    deleteOtNote : (...args) => { mockDeletePopup(...args); return Promise.resolve({}); },
}));

beforeEach(() => {
  mockDeletePopup.mockClear();
});

describe("DeletePopup", () => {
    it("renders delete confirmation", async () => {
        render(<I18nProvider><DeletePopup hostData={{noteId: 10}}/></I18nProvider>);
        expect(await screen.findByText(/Delete Note/i)).toBeInTheDocument();
        expect(screen.getByText(/delete this OT Note/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Yes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /No/i })).toBeInTheDocument();
    });

    it("calls deleteOtNote on confirm", async () => {
        const user = userEvent.setup();
        render(<I18nProvider><DeletePopup hostData={{noteId: 10}}/></I18nProvider>);
        await screen.findByText(/Delete Note/i);
        await user.click(screen.getByRole('button', { name: /Yes/i }));
        expect(mockDeletePopup).toHaveBeenCalledWith(10);
    });
});