import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

console.log('SavePopup.spec.jsx cargado inicio');

jest.mock('react-intl', () => ({
  FormattedMessage: ({defaultMessage}) => <span>{defaultMessage}</span>,
  useIntl: () => ({ formatMessage: ({defaultMessage}) => defaultMessage }),
  IntlProvider: ({children}) => <>{children}</>
}));

jest.mock('../i18n/I18nProvider', () => ({ I18nProvider: ({children}) => <>{children}</> }));

// Mock mínimo sin requireActual para evitar carga pesada
jest.mock('carbon-components-react', () => ({
  Modal: ({open, modalHeading, primaryButtonText, secondaryButtonText, onRequestSubmit, onSecondarySubmit, onRequestClose, children}) => open ? (
    <div data-testid="mock-modal">
      <h1>{modalHeading}</h1>
      {children}
      <button onClick={onRequestSubmit}>{primaryButtonText}</button>
      <button onClick={onSecondarySubmit || onRequestClose}>{secondaryButtonText}</button>
    </div>
  ) : null,
  DatePicker: ({children}) => <div data-testid="date-picker">{children}</div>,
  DatePickerInput: ({labelText, ...rest}) => <input aria-label={labelText} {...rest} />, // evita prop desconocida
  TextArea: ({labelText, value, onChange, placeholder, maxCount}) => (
    <div>
      <label>{labelText}</label>
      <textarea aria-label={typeof labelText === 'string' ? labelText : 'Notes'} placeholder={placeholder} value={value} onChange={onChange} max={maxCount} />
    </div>
  )
}));

jest.mock("../i18n/utils", () => ({ getLocale: () => 'en', getTranslations: () => Promise.resolve({}) }));
const mockSaveNote = jest.fn();
const mockUpdateNoteForADay = jest.fn();
jest.mock("./utils", () => ({
  saveNote: (...args) => { mockSaveNote(...args); return Promise.resolve({}); },
  updateNoteForADay: (...args) => { mockUpdateNoteForADay(...args); return Promise.resolve({}); },
}));

import {SavePopup} from "./SavePopup";

if (!window.matchMedia) {
  window.matchMedia = () => ({ matches:false, addListener: () => {}, removeListener: () => {} });
}

jest.setTimeout(15000);

beforeEach(() => {
  mockSaveNote.mockClear();
  mockUpdateNoteForADay.mockClear();
});

describe("SavePopup", () => {
  const setup = (hostData) => render(<SavePopup hostData={hostData} />);

  it("renders Add Note heading when creating", async () => {
    setup({ notes: '', isDayView: false, noteId: undefined, noteDate: new Date() });
    expect(await screen.findByRole('heading', { name: /Add Notes?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it("renders Update Note heading when editing", async () => {
    setup({ notes: 'notes for the day', isDayView: false, noteId: 10, noteDate: new Date() });
    expect(await screen.findByRole('heading', { name: /Update Notes?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
  });

  it("shows validation error when saving empty note", async () => {
    const user = userEvent.setup();
    setup({ notes: '', isDayView: false, noteId: undefined, noteDate: new Date() });
    await screen.findByRole('heading', { name: /Add Notes?/i });
    await user.click(screen.getByRole('button', { name: /Save/i }));
    expect(await screen.findByText(/Note cannot be empty/i)).toBeInTheDocument();
  });

  it("calls saveNote when data valid (normal view)", async () => {
    const user = userEvent.setup();
    setup({ notes: '', isDayView: false, noteId: undefined, noteDate: new Date() });
    await screen.findByRole('heading', { name: /Add Notes?/i });
    const textArea = screen.getByPlaceholderText(/150 characters/i);
    await user.type(textArea, 'notes for the day');
    await user.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockSaveNote).toHaveBeenCalled();
  });

  it("calls saveNote when data valid (day view)", async () => {
    const user = userEvent.setup();
    setup({ notes: '', isDayView: true, noteId: undefined, noteDate: new Date() });
    await screen.findByRole('heading', { name: /Add Notes?/i });
    const textArea = screen.getByPlaceholderText(/150 characters/i);
    await user.type(textArea, 'notes for the day');
    await user.click(screen.getByRole('button', { name: /Save/i }));
    expect(mockSaveNote).toHaveBeenCalled();
  });

  it("calls updateNoteForADay when editing", async () => {
    const user = userEvent.setup();
    setup({ notes: 'notes for the day', isDayView: false, noteId: 10, noteDate: new Date() });
    await screen.findByRole('heading', { name: /Update Notes?/i });
    await user.click(screen.getByRole('button', { name: /Update/i }));
    const textArea = screen.getByPlaceholderText(/150 characters/i);
    await user.clear(textArea);
    await user.type(textArea, 'notes for the day');
    await user.click(screen.getByRole('button', { name: /^Update$/i }));
    expect(mockUpdateNoteForADay).toHaveBeenCalled();
  });
});