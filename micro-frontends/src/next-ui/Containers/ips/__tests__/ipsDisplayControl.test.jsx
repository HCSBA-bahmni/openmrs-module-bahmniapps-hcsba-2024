import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IpsDisplayControl } from "../ipsDisplayControl";

// Mock de react-intl
jest.mock("react-intl", () => ({
  FormattedMessage: ({ defaultMessage, values }) => {
    if (values) {
      return <span>{defaultMessage.replace(/\{(\w+)\}/g, (match, key) => values[key] || match)}</span>;
    }
    return <span>{defaultMessage}</span>;
  },
}));

// Mock del I18nProvider
jest.mock("../../../Components/i18n/I18nProvider", () => ({
  I18nProvider: ({ children }) => <div>{children}</div>,
}));

// Mock de Carbon Components
jest.mock("carbon-components-react", () => ({
  DataTable: ({ children, rows, headers }) => children({ rows, headers, getTableProps: () => ({}), getHeaderProps: ({ header }) => ({ key: header.key }), getRowProps: ({ row }) => ({ key: row.id }) }),
  TableContainer: ({ children }) => <div>{children}</div>,
  Table: ({ children }) => <table>{children}</table>,
  TableHead: ({ children }) => <thead>{children}</thead>,
  TableHeader: ({ children }) => <th>{children}</th>,
  TableBody: ({ children }) => <tbody>{children}</tbody>,
  TableRow: ({ children }) => <tr>{children}</tr>,
  TableCell: ({ children }) => <td>{children}</td>,
  Button: ({ children, onClick, renderIcon }) => <button onClick={onClick}>{children}</button>,
  Loading: ({ description }) => <div>Loading: {description}</div>,
  Tile: ({ children }) => <div className="tile">{children}</div>,
  Tag: ({ children, type }) => <span className={`tag-${type}`}>{children}</span>,
  Grid: ({ children }) => <div className="grid">{children}</div>,
  Row: ({ children }) => <div className="row">{children}</div>,
  Column: ({ children }) => <div className="column">{children}</div>,
}));

describe("IpsDisplayControl", () => {
  const defaultProps = {
    hostData: {
      patient: {
        uuid: "patient-uuid-123",
        display: "Juan Pérez",
      },
      provider: {
        uuid: "provider-uuid-456",
        display: "Dr. María García",
      },
      activeVisit: {
        uuid: "visit-uuid-789",
        visitType: { display: "Consulta Externa" },
      },
    },
    hostApi: {
      navigation: {
        ipsDetails: jest.fn(),
      },
      ipsService: {
        generateDocument: jest.fn(),
      },
    },
    tx: jest.fn((key) => key),
    appService: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders IPS dashboard title", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("IPS LAC Dashboard")).toBeInTheDocument();
    });
  });

  test("displays patient information", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
      expect(screen.getByText("patient-uuid-123")).toBeInTheDocument();
      expect(screen.getByText("Consulta Externa")).toBeInTheDocument();
    });
  });

  test("shows generate IPS document button", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Generate IPS Document")).toBeInTheDocument();
    });
  });

  test("displays all IPS sections", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Immunizations")).toBeInTheDocument();
      expect(screen.getByText("Allergies")).toBeInTheDocument();
      expect(screen.getByText("Current Medications")).toBeInTheDocument();
      expect(screen.getByText("Diagnoses")).toBeInTheDocument();
      expect(screen.getByText("Recent Procedures")).toBeInTheDocument();
    });
  });

  test("displays mock data correctly", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      // Verificar datos de vacunas
      expect(screen.getByText("COVID-19 (Pfizer)")).toBeInTheDocument();
      expect(screen.getByText("Influenza")).toBeInTheDocument();
      
      // Verificar datos de alergias
      expect(screen.getByText("Penicilina")).toBeInTheDocument();
      expect(screen.getByText("Maní")).toBeInTheDocument();
      
      // Verificar datos de medicamentos
      expect(screen.getByText("Metformina 500mg")).toBeInTheDocument();
      expect(screen.getByText("Losartán 50mg")).toBeInTheDocument();
      
      // Verificar datos de diagnósticos
      expect(screen.getByText("Diabetes Mellitus Tipo 2")).toBeInTheDocument();
      expect(screen.getByText("Hipertensión Arterial")).toBeInTheDocument();
      
      // Verificar datos de procedimientos
      expect(screen.getByText("Electrocardiograma")).toBeInTheDocument();
    });
  });

  test("calls generate IPS document function when button is clicked", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      const generateButton = screen.getByText("Generate IPS Document");
      fireEvent.click(generateButton);
      expect(defaultProps.hostApi.ipsService.generateDocument).toHaveBeenCalledWith("patient-uuid-123");
    });
  });

  test("handles loading state", () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  test("handles error state when patient is missing", async () => {
    const propsWithoutPatient = {
      ...defaultProps,
      hostData: {
        ...defaultProps.hostData,
        patient: null,
      },
    };

    render(<IpsDisplayControl {...propsWithoutPatient} />);
    
    // Componente debe manejar graciosamente la ausencia de paciente
    await waitFor(() => {
      expect(screen.getByText("IPS LAC Dashboard")).toBeInTheDocument();
    });
  });

  test("displays view buttons for items", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      const viewButtons = screen.getAllByText("View");
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });

  test("shows correct tags for severity and status", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      // Verificar tags de severidad de alergias
      expect(screen.getByText("Severa")).toBeInTheDocument();
      expect(screen.getByText("Moderada")).toBeInTheDocument();
      
      // Verificar tags de estado de medicamentos
      const activeTags = screen.getAllByText("Activo");
      expect(activeTags.length).toBeGreaterThan(0);
    });
  });

  test("renders procedures table", async () => {
    render(<IpsDisplayControl {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Electrocardiograma")).toBeInTheDocument();
      expect(screen.getByText("Normal")).toBeInTheDocument();
      expect(screen.getByText("Dr. García")).toBeInTheDocument();
    });
  });

  test("handles missing hostApi gracefully", async () => {
    const propsWithoutHostApi = {
      ...defaultProps,
      hostApi: null,
    };

    render(<IpsDisplayControl {...propsWithoutHostApi} />);
    
    await waitFor(() => {
      expect(screen.getByText("IPS LAC Dashboard")).toBeInTheDocument();
      // El componente debe renderizar sin errores
    });
  });
});
