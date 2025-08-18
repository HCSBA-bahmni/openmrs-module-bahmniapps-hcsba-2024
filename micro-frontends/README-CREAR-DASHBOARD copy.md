# Guía Completa: Crear un Nuevo Dashboard con Microfrontends en Bahmni

Esta guía te llevará paso a paso a través del proceso de crear un nuevo Dashboard usando la arquitectura de microfrontends de Bahmni con React.

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Arquitectura de Microfrontends](#arquitectura-de-microfrontends)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Paso 1: Configuración Inicial](#paso-1-configuración-inicial)
5. [Paso 2: Crear el Componente React](#paso-2-crear-el-componente-react)
6. [Paso 3: Registrar el Componente](#paso-3-registrar-el-componente)
7. [Paso 4: Configurar Webpack](#paso-4-configurar-webpack)
8. [Paso 5: Internacionalización](#paso-5-internacionalización)
9. [Paso 6: Estilos y Temas](#paso-6-estilos-y-temas)
10. [Paso 7: Testing](#paso-7-testing)
11. [Paso 8: Compilación y Despliegue](#paso-8-compilación-y-despliegue)
12. [Mejores Prácticas](#mejores-prácticas)
13. [Solución de Problemas](#solución-de-problemas)

## 🔧 Prerrequisitos

### Software Requerido
- **Node.js**: versión 16 o superior
- **Yarn**: versión 1.0.0 o superior (NO usar npm)
- **React**: 16.14.0 (versión específica del proyecto)
- **Webpack**: 5.86.0 o superior

### Conocimientos Técnicos
- React.js y JSX
- Webpack y Module Federation
- AngularJS (para la integración)
- Carbon Design System
- JavaScript ES6+

## 🏗️ Arquitectura de Microfrontends

### Conceptos Clave

**Microfrontend**: Una arquitectura donde aplicaciones frontend se descomponen en características semi-independientes y desplegables de manera independiente.

**Module Federation**: Plugin de Webpack que permite que múltiples builds de JavaScript trabajen juntos como una sola aplicación.

### Componentes de la Arquitectura

```
Host Application (Angular)
├── Microfrontend 1 (React) - IPD Dashboard
├── Microfrontend 2 (React) - Next UI Components
└── Microfrontend 3 (React) - Tu Nuevo Dashboard
```

## 📁 Estructura del Proyecto

```
micro-frontends/
├── src/
│   ├── ipd/                     # Dashboard IPD existente
│   ├── next-ui/                 # Componentes UI existentes
│   ├── tu-dashboard/            # ⭐ Tu nuevo dashboard
│   ├── shared.js                # Dependencias compartidas
│   ├── utils/
│   │   └── bridge-builder.js    # Utilidad para Angular-React
│   └── styles/                  # Estilos globales
├── public/
│   └── i18n/                    # Archivos de traducción
├── package.json
├── webpack.config.js
└── jest.config.js
```

## 🚀 Paso 1: Configuración Inicial

### 1.1 Instalar Dependencias

```bash
cd micro-frontends
yarn install
```

### 1.2 Verificar la Configuración Actual

Revisa el `package.json` para entender las dependencias:

```json
{
  "dependencies": {
    "@carbon/icons-react": "^10.18.0",
    "bahmni-carbon-ui": "0.1.6",
    "carbon-components": "^10.19.0",
    "carbon-components-react": "^7.25.0",
    "react": "16.14.0",
    "react-dom": "16.14.0",
    "react-intl": "^3.3.2"
  }
}
```

## 📦 Paso 2: Crear el Componente React

### 2.1 Crear la Estructura de Carpetas

```bash
mkdir src/laboratory-dashboard
mkdir src/laboratory-dashboard/components
mkdir src/laboratory-dashboard/services
mkdir src/laboratory-dashboard/utils
```

### 2.2 Crear el Componente Principal

**Archivo**: `src/laboratory-dashboard/LaboratoryDashboard.jsx`

```jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import {
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Loading
} from "carbon-components-react";
import { Add16, View16 } from "@carbon/icons-react";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "./laboratory-dashboard.scss";
import { I18nProvider } from "../../next-ui/Components/i18n/I18nProvider";

export function LaboratoryDashboard(props) {
  const { hostData, hostApi, tx, appService } = props;
  const { patient, provider, activeVisit } = hostData;

  // Estados del componente
  const [isLoading, setIsLoading] = useState(true);
  const [labResults, setLabResults] = useState([]);
  const [error, setError] = useState(null);

  // Headers de la tabla
  const headers = [
    { key: "testName", header: tx("LAB_TEST_NAME") || "Test Name" },
    { key: "date", header: tx("LAB_DATE") || "Date" },
    { key: "result", header: tx("LAB_RESULT") || "Result" },
    { key: "status", header: tx("LAB_STATUS") || "Status" },
    { key: "actions", header: tx("LAB_ACTIONS") || "Actions" }
  ];

  // Función para cargar datos del laboratorio
  const loadLabResults = async () => {
    if (!patient || !patient.uuid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Aquí harías la llamada a la API real
      // const response = await hostApi?.labService?.getLabResults(patient.uuid);
      
      // Datos de ejemplo para demostración
      const mockData = [
        {
          id: "1",
          testName: "Hemograma Completo",
          date: "2024-01-15",
          result: "Normal",
          status: "Completado"
        },
        {
          id: "2",
          testName: "Glucosa en Sangre",
          date: "2024-01-14",
          result: "110 mg/dL",
          status: "Completado"
        },
        {
          id: "3",
          testName: "Perfil Lipídico",
          date: "2024-01-13",
          result: "Pendiente",
          status: "En Proceso"
        }
      ];

      setLabResults(mockData);
    } catch (err) {
      console.error("Error loading lab results:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para manejar la navegación a detalles
  const handleViewDetails = (labResult) => {
    // Usar hostApi para navegar
    if (hostApi?.navigation?.labDetails) {
      hostApi.navigation.labDetails(labResult.id);
    }
  };

  // Función para agregar nuevo test
  const handleAddNewTest = () => {
    if (hostApi?.navigation?.addLabTest) {
      hostApi.navigation.addLabTest(patient.uuid);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadLabResults();
  }, [patient]);

  // Renderizar loading
  if (isLoading) {
    return (
      <I18nProvider>
        <div className="laboratory-dashboard-loading">
          <Loading description={tx("LOADING_LAB_RESULTS") || "Loading lab results..."} />
        </div>
      </I18nProvider>
    );
  }

  // Renderizar error
  if (error) {
    return (
      <I18nProvider>
        <div className="laboratory-dashboard-error">
          <FormattedMessage
            id="LAB_ERROR_MESSAGE"
            defaultMessage="Error loading laboratory results: {error}"
            values={{ error }}
          />
        </div>
      </I18nProvider>
    );
  }

  // Preparar filas para la tabla
  const rows = labResults.map((result) => ({
    id: result.id,
    testName: result.testName,
    date: new Date(result.date).toLocaleDateString(),
    result: result.result,
    status: result.status,
    actions: (
      <Button
        kind="ghost"
        renderIcon={View16}
        iconDescription={tx("VIEW_DETAILS") || "View Details"}
        onClick={() => handleViewDetails(result)}
      >
        {tx("VIEW") || "View"}
      </Button>
    )
  }));

  return (
    <I18nProvider>
      <div className="laboratory-dashboard">
        {/* Header */}
        <div className="laboratory-dashboard-header">
          <h2 className="section-title-next-ui">
            <FormattedMessage
              id="LABORATORY_DASHBOARD_TITLE"
              defaultMessage="Laboratory Dashboard"
            />
          </h2>
          
          {activeVisit && (
            <Button
              kind="primary"
              renderIcon={Add16}
              onClick={handleAddNewTest}
            >
              <FormattedMessage
                id="ADD_LAB_TEST"
                defaultMessage="Add Lab Test"
              />
            </Button>
          )}
        </div>

        {/* Información del paciente */}
        <div className="laboratory-dashboard-patient-info">
          <p>
            <strong>
              <FormattedMessage id="PATIENT" defaultMessage="Patient" />:
            </strong>{" "}
            {patient?.display || "Unknown"}
          </p>
          {activeVisit && (
            <p>
              <strong>
                <FormattedMessage id="ACTIVE_VISIT" defaultMessage="Active Visit" />:
              </strong>{" "}
              {activeVisit.visitType?.display}
            </p>
          )}
        </div>

        {/* Tabla de resultados */}
        {labResults.length === 0 ? (
          <div className="laboratory-dashboard-empty">
            <FormattedMessage
              id="NO_LAB_RESULTS"
              defaultMessage="No laboratory results found for this patient."
            />
          </div>
        ) : (
          <DataTable rows={rows} headers={headers}>
            {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader {...getHeaderProps({ header })}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow {...getRowProps({ row })}>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
      </div>
    </I18nProvider>
  );
}

// PropTypes obligatorios para react2angular
LaboratoryDashboard.propTypes = {
  hostData: PropTypes.shape({
    patient: PropTypes.object,
    provider: PropTypes.object,
    activeVisit: PropTypes.object
  }).isRequired,
  hostApi: PropTypes.shape({
    navigation: PropTypes.object,
    labService: PropTypes.object
  }),
  tx: PropTypes.func,
  appService: PropTypes.object
};
```

### 2.3 Crear Estilos para el Componente

**Archivo**: `src/laboratory-dashboard/laboratory-dashboard.scss`

```scss
.laboratory-dashboard {
  padding: 1rem;
  background-color: #ffffff;

  .laboratory-dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 1rem;
  }

  .laboratory-dashboard-patient-info {
    background-color: #f4f4f4;
    padding: 0.75rem;
    margin-bottom: 1rem;
    border-radius: 4px;

    p {
      margin: 0.25rem 0;
      font-size: 0.875rem;
    }
  }

  .laboratory-dashboard-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
  }

  .laboratory-dashboard-error {
    background-color: #fef7f7;
    border: 1px solid #f87171;
    color: #b91c1c;
    padding: 1rem;
    border-radius: 4px;
    margin: 1rem 0;
  }

  .laboratory-dashboard-empty {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    font-style: italic;
  }

  // Personalización de tablas Carbon
  .bx--data-table {
    background-color: #ffffff;

    .bx--table-header-label {
      font-weight: 600;
      color: #161616;
    }

    .bx--data-table td {
      border-bottom: 1px solid #e0e0e0;
    }

    .bx--data-table tr:hover {
      background-color: #f4f4f4;
    }
  }

  // Responsive design
  @media (max-width: 768px) {
    padding: 0.5rem;

    .laboratory-dashboard-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
  }
}

// Tema dark (opcional)
[data-carbon-theme="g100"] .laboratory-dashboard {
  background-color: #161616;
  color: #f4f4f4;

  .laboratory-dashboard-patient-info {
    background-color: #262626;
  }

  .bx--data-table {
    background-color: #161616;
    color: #f4f4f4;
  }
}
```

## 🔌 Paso 3: Registrar el Componente

### 3.1 Crear el Archivo de Índice

**Archivo**: `src/laboratory-dashboard/index.js`

```javascript
// Importar el bridge builder para integración con Angular
import { React2AngularBridgeBuilder } from "../utils/bridge-builder";
import { LaboratoryDashboard } from "./LaboratoryDashboard";

// Nombre del módulo Angular
const MODULE_NAME = "bahmni.mfe.laboratory";

// Crear el módulo Angular
angular.module(MODULE_NAME, [
  "ui.router",
  "bahmni.common.config",
  "bahmni.common.uiHelper",
  "bahmni.common.i18n",
  "bahmni.common.domain"
]);

// Crear el bridge builder
const builder = new React2AngularBridgeBuilder({
  moduleName: MODULE_NAME,
  componentPrefix: "mfeLaboratory",
});

// Registrar el componente con soporte para traducción
builder.createComponentWithTranslationForwarding(
  "Dashboard",
  LaboratoryDashboard
);

// También puedes crear componentes adicionales
// builder.createComponentWithTranslationForwarding(
//   "LabResultDetail",
//   LabResultDetail
// );

// Exportar para uso en otros módulos
export { LaboratoryDashboard };
```

### 3.2 Método Alternativo: Registrar como Microfrontend Remoto

Si prefieres usar Module Federation (para cargar de forma remota):

**Archivo**: `src/laboratory-dashboard/LaboratoryWrapper.jsx`

```jsx
import PropTypes from "prop-types";
import React, { Suspense, lazy } from "react";
import Loader from "../next-ui/Components/Loader/Loader";

export function LaboratoryWrapper(props) {
  // Cargar el dashboard de forma lazy desde un remoto
  const LazyLaboratoryDashboard = lazy(() => 
    import("@openmrs-mf/laboratory/LaboratoryDashboard")
  );

  return (
    <>
      <Suspense fallback={<Loader />}>
        <LazyLaboratoryDashboard
          hostData={props.hostData}
          hostApi={props.hostApi}
        />
      </Suspense>
    </>
  );
}

LaboratoryWrapper.propTypes = {
  hostData: PropTypes.object.isRequired,
  hostApi: PropTypes.shape({
    navigation: PropTypes.shape({
      labDetails: PropTypes.func,
      addLabTest: PropTypes.func,
    }),
  }).isRequired,
};
```

### 3.3 Registrar en Angular (Método Remoto)

**Archivo**: `src/laboratory-dashboard/index.js` (versión remota)

```javascript
import { react2angular } from "react2angular";
import { LaboratoryWrapper } from "./LaboratoryWrapper";

angular.module("bahmni.mfe.laboratory", [
  "ui.router",
  "bahmni.common.config",
  "bahmni.common.uiHelper",
  "bahmni.common.i18n",
  "bahmni.common.domain",
]);

// Registrar como componente Angular
angular
  .module("bahmni.mfe.laboratory")
  .component("mfeLaboratoryDashboard", react2angular(LaboratoryWrapper), {
    template:
      '<mfe-laboratory-dashboard host-data="hostData" host-api="hostApi"></mfe-laboratory-dashboard>'
  });
```

## ⚙️ Paso 4: Configurar Webpack

### 4.1 Actualizar webpack.config.js

Agrega tu nuevo dashboard a la configuración de Webpack:

```javascript
// En webpack.config.js, actualizar la sección entry
module.exports = {
  entry: {
    ipd: "./src/ipd/index.js",
    "next-ui": "./src/next-ui/index.js",
    "laboratory-dashboard": "./src/laboratory-dashboard/index.js", // ⭐ Agregar esta línea
    shared: "./src/shared.js",
  },
  
  // ... resto de la configuración
  
  plugins: [
    // ... otros plugins
    new ModuleFederationPlugin({
      name: "bahmni_mfe_host",
      filename: "remoteEntry.js",
      remotes: {
        "@openmrs-mf/ipd": remoteProxiedAtHostDomain({ name: "bahmni_ipd", path: "ipd" }),
        // Si usas carga remota, agregar:
        "@openmrs-mf/laboratory": remoteProxiedAtHostDomain({ name: "bahmni_laboratory", path: "laboratory" }),
      },
      exposes: {
        // Si quieres exponer tu dashboard como remoto:
        "./LaboratoryDashboard": "./src/laboratory-dashboard/LaboratoryDashboard",
      },
      shared: {
        // ... configuración compartida existente
      },
    }),
  ],
};
```

### 4.2 Configuración Opcional de Proxy (para desarrollo)

Si usas un servidor de desarrollo, puedes configurar un proxy:

```javascript
// En webpack.config.js
module.exports = {
  devServer: {
    proxy: {
      '/laboratory': {
        target: 'http://localhost:3001', // Puerto de tu microfrontend
        changeOrigin: true,
      },
    },
  },
  // ... resto de la configuración
};
```

## 🌐 Paso 5: Internacionalización

### 5.1 Agregar Traducciones

**Archivo**: `public/i18n/locale_en.json`

```json
{
  "LABORATORY_DASHBOARD_TITLE": "Laboratory Dashboard",
  "LAB_TEST_NAME": "Test Name",
  "LAB_DATE": "Date",
  "LAB_RESULT": "Result",
  "LAB_STATUS": "Status",
  "LAB_ACTIONS": "Actions",
  "ADD_LAB_TEST": "Add Lab Test",
  "VIEW_DETAILS": "View Details",
  "VIEW": "View",
  "PATIENT": "Patient",
  "ACTIVE_VISIT": "Active Visit",
  "NO_LAB_RESULTS": "No laboratory results found for this patient.",
  "LOADING_LAB_RESULTS": "Loading lab results...",
  "LAB_ERROR_MESSAGE": "Error loading laboratory results: {error}"
}
```

**Archivo**: `public/i18n/locale_es.json`

```json
{
  "LABORATORY_DASHBOARD_TITLE": "Panel de Laboratorio",
  "LAB_TEST_NAME": "Nombre del Examen",
  "LAB_DATE": "Fecha",
  "LAB_RESULT": "Resultado",
  "LAB_STATUS": "Estado",
  "LAB_ACTIONS": "Acciones",
  "ADD_LAB_TEST": "Agregar Examen",
  "VIEW_DETAILS": "Ver Detalles",
  "VIEW": "Ver",
  "PATIENT": "Paciente",
  "ACTIVE_VISIT": "Visita Activa",
  "NO_LAB_RESULTS": "No se encontraron resultados de laboratorio para este paciente.",
  "LOADING_LAB_RESULTS": "Cargando resultados de laboratorio...",
  "LAB_ERROR_MESSAGE": "Error al cargar resultados de laboratorio: {error}"
}
```

### 5.2 Usar el Proveedor de Internacionalización

```jsx
// En tu componente
import { I18nProvider } from "../../next-ui/Components/i18n/I18nProvider";
import { FormattedMessage } from "react-intl";

export function LaboratoryDashboard(props) {
  const { tx } = props; // Función de traducción de Angular

  return (
    <I18nProvider>
      <div>
        <h2>
          <FormattedMessage
            id="LABORATORY_DASHBOARD_TITLE"
            defaultMessage="Laboratory Dashboard"
          />
        </h2>
        
        {/* O usar la función tx directamente */}
        <p>{tx("PATIENT") || "Patient"}</p>
      </div>
    </I18nProvider>
  );
}
```

## 🎨 Paso 6: Estilos y Temas

### 6.1 Importar Estilos Base

En tu componente principal, importa los estilos necesarios:

```jsx
// Estilos obligatorios de Carbon
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";

// Tu estilo personalizado
import "./laboratory-dashboard.scss";
```

### 6.2 Usar Carbon Design System

```jsx
import {
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Loading,
  Modal,
  TextInput,
  Select,
  SelectItem,
  DatePicker,
  DatePickerInput,
  Tile,
  Grid,
  Row,
  Column
} from "carbon-components-react";

import {
  Add16,
  View16,
  Edit16,
  Delete16,
  Download16
} from "@carbon/icons-react";
```

### 6.3 Componentes de Bahmni Carbon UI

```jsx
import { NotificationCarbon } from "bahmni-carbon-ui";

// Uso en el componente
<NotificationCarbon
  messageDuration={3000}
  onClose={() => setShowNotification(false)}
  showMessage={showNotification}
  kind="success"
  title="Operation completed successfully"
  hideCloseButton={false}
/>
```

## 🧪 Paso 7: Testing

### 7.1 Configurar Jest

Ya está configurado en `jest.config.js`, pero asegúrate de tener:

```javascript
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  moduleNameMapping: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/src/__mocks__/fileMock.js"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(carbon-components-react|carbon-components|@carbon)/)"
  ]
};
```

### 7.2 Crear Pruebas Unitarias

**Archivo**: `src/laboratory-dashboard/__tests__/LaboratoryDashboard.test.jsx`

```jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LaboratoryDashboard } from "../LaboratoryDashboard";

// Mock de react-intl
jest.mock("react-intl", () => ({
  FormattedMessage: ({ defaultMessage }) => <span>{defaultMessage}</span>,
}));

// Mock del I18nProvider
jest.mock("../../next-ui/Components/i18n/I18nProvider", () => ({
  I18nProvider: ({ children }) => <div>{children}</div>,
}));

describe("LaboratoryDashboard", () => {
  const defaultProps = {
    hostData: {
      patient: {
        uuid: "patient-uuid",
        display: "John Doe",
      },
      provider: {
        uuid: "provider-uuid",
        display: "Dr. Smith",
      },
      activeVisit: {
        uuid: "visit-uuid",
        visitType: { display: "OPD" },
      },
    },
    hostApi: {
      navigation: {
        labDetails: jest.fn(),
        addLabTest: jest.fn(),
      },
    },
    tx: jest.fn((key) => key),
    appService: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders dashboard title", async () => {
    render(<LaboratoryDashboard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Laboratory Dashboard")).toBeInTheDocument();
    });
  });

  test("displays patient information", async () => {
    render(<LaboratoryDashboard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  test("shows add button when active visit exists", async () => {
    render(<LaboratoryDashboard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Add Lab Test")).toBeInTheDocument();
    });
  });

  test("calls navigation function when view button is clicked", async () => {
    render(<LaboratoryDashboard {...defaultProps} />);
    
    await waitFor(() => {
      const viewButtons = screen.getAllByText("View");
      fireEvent.click(viewButtons[0]);
      expect(defaultProps.hostApi.navigation.labDetails).toHaveBeenCalled();
    });
  });

  test("handles loading state", () => {
    render(<LaboratoryDashboard {...defaultProps} />);
    
    expect(screen.getByText("Loading lab results...")).toBeInTheDocument();
  });

  test("handles empty state when no lab results", async () => {
    const propsWithoutVisit = {
      ...defaultProps,
      hostData: {
        ...defaultProps.hostData,
        activeVisit: null,
      },
    };

    render(<LaboratoryDashboard {...propsWithoutVisit} />);
    
    await waitFor(() => {
      expect(screen.getByText("No laboratory results found for this patient.")).toBeInTheDocument();
    });
  });
});
```

### 7.3 Ejecutar Pruebas

```bash
# Ejecutar todas las pruebas
yarn test

# Ejecutar pruebas en modo watch
yarn test --watch

# Ejecutar pruebas con coverage
yarn test:ci
```

## 🚀 Paso 8: Compilación y Despliegue

### 8.1 Compilar para Desarrollo

```bash
yarn build:dev
```

### 8.2 Compilar para Producción

```bash
yarn build
```

### 8.3 Verificar la Salida

Los archivos compilados se generarán en:
```
../ui/app/micro-frontends-dist/
├── laboratory-dashboard.min.js
├── laboratory-dashboard.min.css
├── ipd.min.js
├── next-ui.min.js
└── shared.min.js
```

### 8.4 Integrar con la Aplicación Principal

Para usar tu dashboard en la aplicación principal de Bahmni, necesitas:

1. **Incluir los archivos en el HTML principal**:

```html
<!-- En ui/app/index.html o el archivo principal -->
<script src="micro-frontends-dist/shared.min.js"></script>
<script src="micro-frontends-dist/laboratory-dashboard.min.js"></script>
<link rel="stylesheet" href="micro-frontends-dist/laboratory-dashboard.min.css">
```

2. **Registrar la ruta en AngularJS**:

```javascript
// En tu archivo de configuración de rutas
angular.module("bahmni.clinic")
  .config(["$routeProvider", function($routeProvider) {
    $routeProvider
      .when("/laboratory", {
        template: '<mfe-laboratory-dashboard host-data="hostData" host-api="hostApi"></mfe-laboratory-dashboard>',
        controller: "LaboratoryController"
      });
  }]);
```

3. **Crear el controlador Angular**:

```javascript
angular.module("bahmni.clinic")
  .controller("LaboratoryController", ["$scope", "patientService", "visitService",
    function($scope, patientService, visitService) {
      // Preparar datos para el microfrontend
      $scope.hostData = {
        patient: patientService.getPatient(),
        provider: $scope.currentProvider,
        activeVisit: visitService.getActiveVisit()
      };

      // Preparar API para el microfrontend
      $scope.hostApi = {
        navigation: {
          labDetails: function(labId) {
            $location.path("/laboratory/details/" + labId);
          },
          addLabTest: function(patientUuid) {
            $location.path("/laboratory/add/" + patientUuid);
          }
        }
      };
    }
  ]);
```

## 🎯 Mejores Prácticas

### 9.1 Estructura de Código

```
src/laboratory-dashboard/
├── index.js                    # Punto de entrada y registro
├── LaboratoryDashboard.jsx     # Componente principal
├── laboratory-dashboard.scss   # Estilos
├── components/                 # Subcomponentes
│   ├── LabResultCard.jsx
│   ├── LabTestForm.jsx
│   └── LabStatusBadge.jsx
├── services/                   # Servicios de API
│   ├── labService.js
│   └── patientService.js
├── utils/                      # Utilidades
│   ├── formatters.js
│   └── validators.js
├── hooks/                      # Custom hooks
│   ├── useLabResults.js
│   └── usePatientData.js
└── __tests__/                  # Pruebas
    ├── LaboratoryDashboard.test.jsx
    ├── components/
    └── services/
```

### 9.2 Manejo de Estado

```jsx
// Usar hooks de React para el estado local
import React, { useState, useEffect, useReducer } from "react";

// Para estado complejo, usar useReducer
const labReducer = (state, action) => {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: true, error: null };
    case "SUCCESS":
      return { ...state, isLoading: false, data: action.payload };
    case "ERROR":
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
};

export function LaboratoryDashboard() {
  const [state, dispatch] = useReducer(labReducer, {
    isLoading: false,
    data: [],
    error: null
  });

  // ... resto del componente
}
```

### 9.3 Manejo de Errores

```jsx
// Error Boundary para capturar errores
class LaboratoryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Laboratory Dashboard Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong in Laboratory Dashboard.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usar en el componente principal
export function LaboratoryDashboard(props) {
  return (
    <LaboratoryErrorBoundary>
      {/* Tu contenido aquí */}
    </LaboratoryErrorBoundary>
  );
}
```

### 9.4 Performance

```jsx
// Usar React.memo para evitar re-renders innecesarios
export const LaboratoryDashboard = React.memo(function LaboratoryDashboard(props) {
  // ... componente
});

// Usar useCallback para funciones
const handleViewDetails = useCallback((labResult) => {
  if (hostApi?.navigation?.labDetails) {
    hostApi.navigation.labDetails(labResult.id);
  }
}, [hostApi]);

// Usar useMemo para cálculos costosos
const filteredResults = useMemo(() => {
  return labResults.filter(result => result.status === selectedStatus);
}, [labResults, selectedStatus]);
```

### 9.5 Accesibilidad

```jsx
// Usar semantic HTML y ARIA labels
<button
  aria-label={`View details for ${result.testName}`}
  aria-describedby={`status-${result.id}`}
  onClick={() => handleViewDetails(result)}
>
  View Details
</button>

// Manejo de teclado
const handleKeyDown = (event, action) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
};

// Focus management
const firstButtonRef = useRef(null);

useEffect(() => {
  if (firstButtonRef.current) {
    firstButtonRef.current.focus();
  }
}, []);
```

## 🔧 Solución de Problemas

### 10.1 Errores Comunes

**Error**: "React is not defined"
```
Solución: Asegúrate de que React está importado correctamente y configurado como external en webpack.config.js
```

**Error**: "Cannot resolve module"
```
Solución: Verifica que todas las dependencias estén instaladas y los paths sean correctos
```

**Error**: "Component not rendering in Angular"
```
Solución: Verifica que:
1. PropTypes están definidos
2. El componente está registrado correctamente
3. Los datos hostData se pasan correctamente
```

### 10.2 Debugging

```jsx
// Agregar logging para debugging
useEffect(() => {
  console.log("LaboratoryDashboard mounted with props:", props);
  console.log("Patient data:", props.hostData?.patient);
  console.log("Host API:", props.hostApi);
}, [props]);

// Usar React Developer Tools
// Instalar: https://react-dev-tools.com/
```

### 10.3 Testing de Integración

```javascript
// Simular la integración con Angular
describe("Angular Integration", () => {
  test("should register component correctly", () => {
    // Mock angular module
    const mockModule = {
      component: jest.fn()
    };
    
    global.angular = {
      module: jest.fn(() => mockModule)
    };

    // Import your index.js
    require("../index.js");

    expect(mockModule.component).toHaveBeenCalledWith(
      expect.stringContaining("mfeLaboratory"),
      expect.any(Function)
    );
  });
});
```

## 📚 Recursos Adicionales

### Documentación
- [Carbon Design System](https://carbondesignsystem.com/)
- [React Documentation](https://reactjs.org/docs)
- [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/)
- [OpenMRS Frontend](https://wiki.openmrs.org/display/projects/Frontend)

### Herramientas Útiles
- [React Developer Tools](https://react-dev-tools.com/)
- [Carbon Components Storybook](https://react.carbondesignsystem.com/)
- [Webpack Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)

### Comunidad
- [OpenMRS Talk](https://talk.openmrs.org/)
- [Bahmni Wiki](https://bahmni.atlassian.net/wiki/spaces/BAH/overview)

---

## 🎉 ¡Felicidades!

Has creado exitosamente un nuevo Dashboard usando microfrontends de Bahmni con React. Este dashboard es:

- ✅ **Modular**: Independiente y reutilizable
- ✅ **Escalable**: Fácil de mantener y extender
- ✅ **Accesible**: Siguiendo las mejores prácticas de accesibilidad
- ✅ **Internacionalizado**: Soporte para múltiples idiomas
- ✅ **Testeable**: Con pruebas unitarias y de integración
- ✅ **Performante**: Optimizado para producción

¡Ahora puedes personalizar y extender tu dashboard según las necesidades específicas de tu proyecto!
