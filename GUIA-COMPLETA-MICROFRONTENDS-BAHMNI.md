# 📋 Guía Completa: Crear Dashboards con Microfrontends en Bahmni

> **Versión:** 2.0 - Actualizada para máxima precisión y completitud  
> **Fecha:** Agosto 2025  
> **Autor:** Basado en implementación real del proyecto HCSBA

## 🎯 Tabla de Contenidos

1. [📝 Resumen Ejecutivo](#resumen-ejecutivo)
2. [🔧 Prerrequisitos y Configuración del Entorno](#prerrequisitos-y-configuración-del-entorno)
3. [🏗️ Arquitectura de Microfrontends](#arquitectura-de-microfrontends)
4. [📁 Estructura del Proyecto](#estructura-del-proyecto)
5. [⚙️ Configuración Inicial del Workspace](#configuración-inicial-del-workspace)
6. [🚀 Crear un Nuevo Dashboard](#crear-un-nuevo-dashboard)
7. [🔌 Integración con Angular](#integración-con-angular)
8. [⚙️ Configuración de Webpack](#configuración-de-webpack)
9. [🌐 Internacionalización (i18n)](#internacionalización-i18n)
10. [🎨 Estilos y Temas](#estilos-y-temas)
11. [🧪 Testing](#testing)
12. [🚀 Build y Despliegue](#build-y-despliegue)
13. [🔗 Configuración en Bahmni](#configuración-en-bahmni)
14. [🎯 Mejores Prácticas](#mejores-prácticas)
15. [🔧 Solución de Problemas](#solución-de-problemas)
16. [📚 Recursos y Referencias](#recursos-y-referencias)

---

## 📝 Resumen Ejecutivo

Esta guía proporciona instrucciones paso a paso para crear **dashboards personalizados** usando la arquitectura de **microfrontends** en Bahmni. Los microfrontends permiten desarrollar funcionalidades independientes en React que se integran seamlessly con la aplicación principal AngularJS de Bahmni.

### ✅ Lo que lograrás:
- ✅ Crear dashboards modulares y reutilizables
- ✅ Integrar React con AngularJS existente
- ✅ Implementar internacionalización
- ✅ Aplicar mejores prácticas de testing
- ✅ Desplegar en producción

### 🎯 Casos de uso típicos:
- **IPS Dashboard**: Resumen Internacional del Paciente
- **Laboratory Dashboard**: Panel de resultados de laboratorio
- **Provider Notifications**: Notificaciones para proveedores
- **Patient Allergies**: Gestión de alergias de pacientes
- **Custom Forms**: Formularios personalizados

---

## 🔧 Prerrequisitos y Configuración del Entorno

### 📦 Software Requerido

| Herramienta | Versión Recomendada | Versión Mínima | Notas |
|-------------|---------------------|----------------|-------|
| **Node.js** | 10.11.0 | 10.x | Usar nvm para gestión de versiones |
| **Yarn** | 1.22.x | 1.0.0 | **NO usar npm** |
| **Grunt CLI** | Latest | 1.0.0 | `npm install -g grunt-cli` |
| **Ruby** | 3.1.x | 2.7+ | Para Compass/SASS |
| **Compass** | 1.0.3 | 1.0.0 | `gem install compass` |
| **Git** | Latest | 2.0+ | Control de versiones |

### 🛠️ Instalación Paso a Paso

#### 1. Instalar Node.js con NVM

```bash
# Windows (usar Git Bash o WSL)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reiniciar terminal
nvm install 10.11.0
nvm use 10.11.0
nvm alias default 10.11.0
```

#### 2. Instalar Herramientas Globales

```bash
# Yarn (gestor de paquetes)
npm install -g yarn

# Grunt CLI (build tool)
npm install -g grunt-cli
```

#### 3. Instalar Ruby y Compass

**En Windows:**
```bash
# Si usas RVM
rvm install 3.1.7
rvm use 3.1.7 --default
gem install compass

# Verificar instalación
ruby --version
compass --version
```

**En WSL/Linux:**
```bash
# Instalar RVM
curl -sSL https://get.rvm.io | bash -s stable
source ~/.rvm/scripts/rvm
rvm install 3.1.7
rvm use 3.1.7 --default
gem install compass
```

#### 4. Verificar Instalación

```bash
node --version    # Debe mostrar v10.11.0
yarn --version    # Debe mostrar 1.22.x
grunt --version   # Debe mostrar grunt-cli
compass --version # Debe mostrar Compass 1.0.3
```

### 🔍 Configuración del Entorno de Desarrollo

#### Variables de Entorno Recomendadas

```bash
# .bashrc o .zshrc
export NODE_ENV=development
export BAHMNI_APPS_PATH="/path/to/openmrs-module-bahmniapps"
export BAHMNI_CONFIG_PATH="/path/to/bahmni-config"
```

---

## 🏗️ Arquitectura de Microfrontends

### 🎯 Conceptos Fundamentales

**Microfrontend**: Arquitectura donde aplicaciones frontend se descomponen en características semi-independientes, cada una desplegable por separado.

**Module Federation**: Plugin de Webpack 5 que permite que múltiples builds trabajen como una aplicación unificada.

### 📐 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                 Host Application (AngularJS)            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │     IPD     │  │   Next-UI   │  │    IPS      │     │
│  │  Dashboard  │  │ Components  │  │  Dashboard  │     │
│  │   (React)   │  │   (React)   │  │   (React)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│                    Shared Dependencies                  │
│          (React, Carbon UI, Utilities)                 │
└─────────────────────────────────────────────────────────┘
```

### 🔄 Flujo de Comunicación

```
┌─────────────┐    hostData     ┌─────────────┐
│   Angular   │ ─────────────▶ │    React    │
│ Controller  │                │ Component   │
│             │ ◀───────────── │             │
└─────────────┘    hostApi     └─────────────┘
```

### 🧩 Componentes de la Arquitectura

1. **Host Application**: Aplicación principal AngularJS de Bahmni
2. **Microfrontends**: Componentes React independientes
3. **Bridge Layer**: Capa de integración entre Angular y React
4. **Shared Dependencies**: Dependencias compartidas (React, Carbon UI)
5. **Build System**: Webpack con Module Federation

---

## 📁 Estructura del Proyecto

### 🗂️ Estructura Completa

```
openmrs-module-bahmniapps-hcsba-2024/
├── micro-frontends/                    # 🎯 Workspace de microfrontends
│   ├── src/
│   │   ├── ipd/                        # Dashboard IPD existente
│   │   │   ├── index.js
│   │   │   ├── IpdDashboard.jsx
│   │   │   └── CareViewDashboard.jsx
│   │   ├── next-ui/                    # Componentes UI reutilizables
│   │   │   ├── index.js
│   │   │   ├── constants.js
│   │   │   ├── Components/
│   │   │   │   ├── i18n/
│   │   │   │   ├── Loader/
│   │   │   │   ├── ErrorNotification/
│   │   │   │   └── ...
│   │   │   ├── Containers/
│   │   │   │   ├── formDisplayControl/
│   │   │   │   ├── ips/
│   │   │   │   ├── providerNotifications/
│   │   │   │   └── patientAlergies/
│   │   │   └── utils/
│   │   │       ├── bridge-builder.js   # 🔗 Angular-React bridge
│   │   │       ├── providerNotifications/
│   │   │       └── ipsService/
│   │   ├── tu-nuevo-dashboard/         # 🆕 Tu dashboard personalizado
│   │   │   ├── index.js                # Punto de entrada
│   │   │   ├── MiDashboard.jsx         # Componente principal
│   │   │   ├── mi-dashboard.scss       # Estilos
│   │   │   ├── components/             # Subcomponentes
│   │   │   ├── services/               # Servicios API
│   │   │   ├── utils/                  # Utilidades
│   │   │   └── __tests__/              # Tests
│   │   ├── shared.js                   # Dependencias compartidas
│   │   ├── polyfill.js                 # Polyfills para compatibilidad
│   │   └── styles/                     # Estilos globales
│   │       ├── carbon-conflict-fixes.scss
│   │       ├── carbon-theme.scss
│   │       └── common.scss
│   ├── public/
│   │   └── i18n/                       # Archivos de traducción
│   │       ├── locale_en.json
│   │       ├── locale_es.json
│   │       ├── locale_fr.json
│   │       └── ...
│   ├── package.json                    # Dependencias del workspace
│   ├── webpack.config.js               # Configuración de build
│   ├── jest.config.js                  # Configuración de testing
│   └── README.md
├── ui/                                 # 🎯 Aplicación principal AngularJS
│   ├── app/
│   │   ├── admin/
│   │   ├── clinical/
│   │   ├── registration/
│   │   ├── common/
│   │   ├── micro-frontends-dist/       # 📦 Output del build
│   │   │   ├── shared.min.js
│   │   │   ├── ipd.min.js
│   │   │   ├── next-ui.min.js
│   │   │   ├── tu-dashboard.min.js     # Tu dashboard compilado
│   │   │   └── *.min.css
│   │   └── ...
│   ├── Gruntfile.js                    # Build de la app principal
│   ├── package.json
│   └── dist/                           # 📦 Output final
├── package/                            # Docker y deployment
├── scripts/                            # Scripts de utilidad
└── README.md                           # Documentación principal
```

### 📝 Explicación de Carpetas Clave

| Carpeta | Propósito | Responsabilidad |
|---------|-----------|-----------------|
| `micro-frontends/src/` | Código fuente de microfrontends | Desarrollo de componentes React |
| `ui/app/micro-frontends-dist/` | Archivos compilados | Output del build de microfrontends |
| `ui/dist/` | Build final de toda la app | Deployment en producción |
| `public/i18n/` | Archivos de traducción | Internacionalización |
| `src/shared.js` | Dependencias compartidas | Optimización del bundle |

---

## ⚙️ Configuración Inicial del Workspace

### 1. 📥 Clonar y Configurar el Repositorio

```bash
# Clonar el repositorio
git clone https://github.com/HCSBA-bahmni/openmrs-module-bahmniapps-hcsba-2024.git
cd openmrs-module-bahmniapps-hcsba-2024

# Instalar dependencias de microfrontends
cd micro-frontends
yarn install

# Instalar dependencias de la app principal
cd ../ui
yarn install
```

### 2. 🔍 Verificar la Configuración

```bash
# En micro-frontends/
yarn build:dev    # Debe completarse sin errores

# En ui/
yarn ci          # Puede fallar en compass, ver solución abajo
```

### 3. 🛠️ Solución para Problemas de Compass

Si `yarn ci` falla con error de compass, ejecutar manualmente:

```bash
# En ui/
compass compile --sass-dir=app/styles --css-dir=app/styles/ --images-dir=app/images --javascripts-dir=app/scripts --fonts-dir=app/styles/fonts --import-path=app/components --relative-assets --time

# Luego ejecutar el build sin compass
grunt bundle
grunt uglify-and-rename
grunt preprocess:web
```

---

## 🚀 Crear un Nuevo Dashboard

### 📝 Paso 1: Planificación del Dashboard

#### 1.1 Definir Requisitos

**Ejemplo: Dashboard de Laboratorio**

| Requisito | Descripción |
|-----------|-------------|
| **Funcionalidad Principal** | Mostrar resultados de laboratorio del paciente |
| **Datos Necesarios** | Patient UUID, Visit UUID, Provider info |
| **APIs Requeridas** | `/api/labs/patient/{uuid}`, `/api/labs/results` |
| **Acciones** | Ver detalles, Descargar reportes, Agregar nuevos tests |
| **Permisos** | Solo usuarios con rol `LabTechnician` o `Doctor` |

#### 1.2 Crear Estructura de Carpetas

```bash
cd micro-frontends/src/
mkdir laboratory-dashboard
cd laboratory-dashboard

# Crear estructura completa
mkdir components services utils hooks __tests__
touch index.js LaboratoryDashboard.jsx laboratory-dashboard.scss
```

### 📝 Paso 2: Implementar el Componente Principal

#### 2.1 Crear el Componente Principal

**Archivo:** `src/laboratory-dashboard/LaboratoryDashboard.jsx`

```jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Loading,
  Modal,
  Grid,
  Row,
  Column,
  Tile,
  SkeletonPlaceholder,
  InlineNotification
} from "carbon-components-react";
import { 
  Add16, 
  View16, 
  Download16, 
  Renew16, 
  ChartLineSmooth16 
} from "@carbon/icons-react";

// Importar estilos obligatorios
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "./laboratory-dashboard.scss";

// Importar componentes de utilidad
import { I18nProvider } from "../../next-ui/Components/i18n/I18nProvider";
import { NotificationCarbon } from "bahmni-carbon-ui";

// Importar servicios y utilidades locales
import { useLaboratoryData } from "./hooks/useLaboratoryData";
import { formatLabResult, formatDate } from "./utils/formatters";
import { validateLabTest } from "./utils/validators";

/**
 * 🧪 Laboratory Dashboard Component
 * 
 * Displays laboratory results and tests for a patient
 * Integrates with Bahmni's laboratory management system
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.hostData - Data from Angular host
 * @param {Object} props.hostApi - API methods from Angular host  
 * @param {Function} props.tx - Translation function
 * @param {Object} props.appService - Bahmni app service
 */
export function LaboratoryDashboard(props) {
  const { hostData, hostApi, tx, appService } = props;
  const { patient, provider, activeVisit, encounter } = hostData || {};

  // 🎯 Estados del componente
  const [isLoading, setIsLoading] = useState(true);
  const [labResults, setLabResults] = useState([]);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: '30days',
    testType: 'all'
  });

  // 🎣 Custom hook para datos de laboratorio
  const {
    data: labData,
    loading: labLoading,
    error: labError,
    refetch: refetchLabs
  } = useLaboratoryData(patient?.uuid, filters);

  // 📊 Headers de la tabla (memoizados para performance)
  const tableHeaders = useMemo(() => [
    { 
      key: "testName", 
      header: tx("LAB_TEST_NAME") || "Test Name" 
    },
    { 
      key: "date", 
      header: tx("LAB_DATE") || "Date" 
    },
    { 
      key: "result", 
      header: tx("LAB_RESULT") || "Result" 
    },
    { 
      key: "status", 
      header: tx("LAB_STATUS") || "Status" 
    },
    { 
      key: "provider", 
      header: tx("LAB_PROVIDER") || "Provider" 
    },
    { 
      key: "actions", 
      header: tx("LAB_ACTIONS") || "Actions" 
    }
  ], [tx]);

  // 🔄 Efectos
  useEffect(() => {
    if (!patient?.uuid) {
      setError(tx("NO_PATIENT_SELECTED") || "No patient selected");
      setIsLoading(false);
      return;
    }
    
    // Actualizar estados basado en el custom hook
    setIsLoading(labLoading);
    setLabResults(labData || []);
    setError(labError);
  }, [patient, labData, labLoading, labError, tx]);

  // 📝 Handlers de eventos
  const handleViewDetails = useCallback((labResult) => {
    setSelectedResult(labResult);
    setShowDetailModal(true);
    
    // Tracking de analytics
    if (hostApi?.analytics?.track) {
      hostApi.analytics.track('lab_result_viewed', {
        resultId: labResult.id,
        testType: labResult.testType,
        patientId: patient?.uuid
      });
    }
  }, [hostApi, patient]);

  const handleDownloadReport = useCallback(async (labResult) => {
    try {
      if (hostApi?.labService?.downloadReport) {
        const response = await hostApi.labService.downloadReport(labResult.id);
        
        // Crear enlace de descarga
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `lab_report_${labResult.testName}_${formatDate(labResult.date)}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        setNotification({
          kind: 'success',
          title: tx("DOWNLOAD_SUCCESS") || "Download completed",
          subtitle: tx("REPORT_DOWNLOADED") || "Report has been downloaded successfully"
        });
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      setNotification({
        kind: 'error',
        title: tx("DOWNLOAD_ERROR") || "Download failed",
        subtitle: error.message || "Unknown error occurred"
      });
    }
  }, [hostApi, tx]);

  const handleAddNewTest = useCallback(() => {
    if (hostApi?.navigation?.addLabTest) {
      hostApi.navigation.addLabTest(patient.uuid, activeVisit?.uuid);
    } else {
      // Fallback navigation
      const url = `/clinical/#/patient/${patient.uuid}/dashboard/lab/add`;
      if (hostApi?.navigation?.goTo) {
        hostApi.navigation.goTo(url);
      } else {
        window.location.href = url;
      }
    }
  }, [hostApi, patient, activeVisit]);

  const handleRefresh = useCallback(() => {
    refetchLabs();
    setNotification({
      kind: 'info',
      title: tx("REFRESHING") || "Refreshing data",
      subtitle: tx("LOADING_LATEST_RESULTS") || "Loading latest lab results..."
    });
  }, [refetchLabs, tx]);

  // 📋 Preparar datos para la tabla
  const tableRows = useMemo(() => {
    return labResults.map((result, index) => ({
      id: result.id || `lab-${index}`,
      testName: result.testName || '—',
      date: formatDate(result.date),
      result: formatLabResult(result.value, result.unit, result.referenceRange),
      status: (
        <span className={`lab-status lab-status--${result.status?.toLowerCase()}`}>
          {tx(`LAB_STATUS_${result.status?.toUpperCase()}`) || result.status}
        </span>
      ),
      provider: result.provider?.name || '—',
      actions: (
        <div className="lab-actions">
          <Button
            kind="ghost"
            size="sm"
            renderIcon={View16}
            iconDescription={tx("VIEW_DETAILS") || "View Details"}
            onClick={() => handleViewDetails(result)}
            disabled={!result.id}
          >
            {tx("VIEW") || "View"}
          </Button>
          {result.reportAvailable && (
            <Button
              kind="ghost"
              size="sm" 
              renderIcon={Download16}
              iconDescription={tx("DOWNLOAD_REPORT") || "Download Report"}
              onClick={() => handleDownloadReport(result)}
            >
              {tx("DOWNLOAD") || "Download"}
            </Button>
          )}
        </div>
      )
    }));
  }, [labResults, tx, handleViewDetails, handleDownloadReport]);

  // 🎨 Renderizar estado de carga
  if (isLoading) {
    return (
      <I18nProvider>
        <div className="laboratory-dashboard laboratory-dashboard--loading">
          <div className="laboratory-dashboard__header">
            <SkeletonPlaceholder className="lab-title-skeleton" />
            <SkeletonPlaceholder className="lab-button-skeleton" />
          </div>
          <Loading 
            description={tx("LOADING_LAB_RESULTS") || "Loading lab results..."} 
            withOverlay={false}
          />
        </div>
      </I18nProvider>
    );
  }

  // 🚨 Renderizar estado de error
  if (error) {
    return (
      <I18nProvider>
        <div className="laboratory-dashboard laboratory-dashboard--error">
          <InlineNotification
            kind="error"
            title={tx("LAB_ERROR_TITLE") || "Error Loading Laboratory Data"}
            subtitle={error}
            lowContrast
          />
          <Button
            kind="tertiary"
            renderIcon={Renew16}
            onClick={handleRefresh}
          >
            {tx("RETRY") || "Try Again"}
          </Button>
        </div>
      </I18nProvider>
    );
  }

  // 🎯 Renderizar componente principal
  return (
    <I18nProvider>
      <div className="laboratory-dashboard">
        {/* 📊 Header del Dashboard */}
        <div className="laboratory-dashboard__header">
          <div className="lab-header-info">
            <h2 className="section-title-next-ui">
              <FormattedMessage
                id="LABORATORY_DASHBOARD_TITLE"
                defaultMessage="Laboratory Dashboard"
              />
            </h2>
            <p className="lab-patient-info">
              <strong>
                <FormattedMessage id="PATIENT" defaultMessage="Patient" />:
              </strong>{" "}
              {patient?.display || "Unknown Patient"}
              {activeVisit && (
                <span className="lab-visit-info">
                  {" • "}
                  <FormattedMessage id="VISIT" defaultMessage="Visit" />:{" "}
                  {activeVisit.visitType?.display}
                </span>
              )}
            </p>
          </div>
          
          <div className="lab-header-actions">
            <Button
              kind="tertiary"
              renderIcon={Renew16}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <FormattedMessage id="REFRESH" defaultMessage="Refresh" />
            </Button>
            
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
        </div>

        {/* 📈 Estadísticas Rápidas */}
        <Grid className="lab-stats-grid">
          <Row>
            <Column lg={3} md={4} sm={2}>
              <Tile className="lab-stat-tile">
                <div className="lab-stat-number">{labResults.length}</div>
                <div className="lab-stat-label">
                  <FormattedMessage id="TOTAL_TESTS" defaultMessage="Total Tests" />
                </div>
              </Tile>
            </Column>
            <Column lg={3} md={4} sm={2}>
              <Tile className="lab-stat-tile">
                <div className="lab-stat-number">
                  {labResults.filter(r => r.status === 'completed').length}
                </div>
                <div className="lab-stat-label">
                  <FormattedMessage id="COMPLETED" defaultMessage="Completed" />
                </div>
              </Tile>
            </Column>
            <Column lg={3} md={4} sm={2}>
              <Tile className="lab-stat-tile">
                <div className="lab-stat-number">
                  {labResults.filter(r => r.status === 'pending').length}
                </div>
                <div className="lab-stat-label">
                  <FormattedMessage id="PENDING" defaultMessage="Pending" />
                </div>
              </Tile>
            </Column>
            <Column lg={3} md={4} sm={2}>
              <Tile className="lab-stat-tile">
                <div className="lab-stat-number">
                  {labResults.filter(r => r.isAbnormal).length}
                </div>
                <div className="lab-stat-label">
                  <FormattedMessage id="ABNORMAL" defaultMessage="Abnormal" />
                </div>
              </Tile>
            </Column>
          </Row>
        </Grid>

        {/* 📋 Tabla de Resultados */}
        <div className="laboratory-dashboard__content">
          {labResults.length === 0 ? (
            <div className="laboratory-dashboard__empty">
              <div className="empty-state">
                <ChartLineSmooth16 className="empty-state-icon" />
                <h3>
                  <FormattedMessage
                    id="NO_LAB_RESULTS_TITLE"
                    defaultMessage="No Laboratory Results"
                  />
                </h3>
                <p>
                  <FormattedMessage
                    id="NO_LAB_RESULTS_DESCRIPTION"
                    defaultMessage="No laboratory results found for this patient. Add a new test to get started."
                  />
                </p>
                {activeVisit && (
                  <Button
                    kind="primary"
                    renderIcon={Add16}
                    onClick={handleAddNewTest}
                  >
                    <FormattedMessage
                      id="ADD_FIRST_TEST"
                      defaultMessage="Add First Test"
                    />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="lab-results-table">
              <DataTable 
                rows={tableRows} 
                headers={tableHeaders}
                isSortable
                useZebraStyles
              >
                {({ 
                  rows, 
                  headers, 
                  getTableProps, 
                  getHeaderProps, 
                  getRowProps,
                  getBatchActionProps,
                  getTableContainerProps
                }) => (
                  <TableContainer 
                    title={tx("LAB_RESULTS_TABLE_TITLE") || "Laboratory Results"}
                    description={tx("LAB_RESULTS_TABLE_DESCRIPTION") || "Complete list of laboratory tests and results"}
                    {...getTableContainerProps()}
                  >
                    <Table {...getTableProps()}>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader 
                              key={header.key}
                              {...getHeaderProps({ header })}
                            >
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id} {...getRowProps({ row })}>
                            {row.cells.map((cell) => (
                              <TableCell key={cell.id}>
                                {cell.value}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            </div>
          )}
        </div>

        {/* 🔍 Modal de Detalles */}
        <Modal
          open={showDetailModal}
          onRequestClose={() => setShowDetailModal(false)}
          modalHeading={
            tx("LAB_RESULT_DETAILS") || "Laboratory Result Details"
          }
          modalLabel={selectedResult?.testName}
          primaryButtonText={tx("CLOSE") || "Close"}
          size="lg"
        >
          {selectedResult && (
            <div className="lab-detail-content">
              <Grid>
                <Row>
                  <Column lg={8}>
                    <div className="detail-section">
                      <h4>
                        <FormattedMessage id="TEST_INFORMATION" defaultMessage="Test Information" />
                      </h4>
                      <dl className="detail-list">
                        <dt>
                          <FormattedMessage id="TEST_NAME" defaultMessage="Test Name" />
                        </dt>
                        <dd>{selectedResult.testName}</dd>
                        
                        <dt>
                          <FormattedMessage id="TEST_DATE" defaultMessage="Test Date" />
                        </dt>
                        <dd>{formatDate(selectedResult.date)}</dd>
                        
                        <dt>
                          <FormattedMessage id="RESULT_VALUE" defaultMessage="Result Value" />
                        </dt>
                        <dd>{selectedResult.value} {selectedResult.unit}</dd>
                        
                        <dt>
                          <FormattedMessage id="REFERENCE_RANGE" defaultMessage="Reference Range" />
                        </dt>
                        <dd>{selectedResult.referenceRange || '—'}</dd>
                      </dl>
                    </div>
                  </Column>
                  <Column lg={8}>
                    <div className="detail-section">
                      <h4>
                        <FormattedMessage id="CLINICAL_INFORMATION" defaultMessage="Clinical Information" />
                      </h4>
                      <dl className="detail-list">
                        <dt>
                          <FormattedMessage id="STATUS" defaultMessage="Status" />
                        </dt>
                        <dd>{selectedResult.status}</dd>
                        
                        <dt>
                          <FormattedMessage id="PROVIDER" defaultMessage="Provider" />
                        </dt>
                        <dd>{selectedResult.provider?.name || '—'}</dd>
                        
                        <dt>
                          <FormattedMessage id="NOTES" defaultMessage="Notes" />
                        </dt>
                        <dd>{selectedResult.notes || tx("NO_NOTES") || "No notes available"}</dd>
                      </dl>
                    </div>
                  </Column>
                </Row>
              </Grid>
            </div>
          )}
        </Modal>

        {/* 🔔 Notificaciones */}
        {notification && (
          <NotificationCarbon
            kind={notification.kind}
            title={notification.title}
            subtitle={notification.subtitle}
            showMessage={true}
            onClose={() => setNotification(null)}
            messageDuration={5000}
          />
        )}
      </div>
    </I18nProvider>
  );
}

// 🔧 PropTypes para validación y documentación
LaboratoryDashboard.propTypes = {
  /**
   * Datos del host Angular que se pasan al componente React
   */
  hostData: PropTypes.shape({
    /** Información del paciente */
    patient: PropTypes.shape({
      uuid: PropTypes.string.isRequired,
      display: PropTypes.string,
      identifier: PropTypes.string,
      age: PropTypes.number,
      gender: PropTypes.string
    }),
    /** Información del proveedor */
    provider: PropTypes.shape({
      uuid: PropTypes.string,
      display: PropTypes.string
    }),
    /** Visita activa */
    activeVisit: PropTypes.shape({
      uuid: PropTypes.string,
      visitType: PropTypes.object,
      startDatetime: PropTypes.string,
      location: PropTypes.object
    }),
    /** Encuentro actual */
    encounter: PropTypes.object
  }).isRequired,
  
  /**
   * APIs del host Angular disponibles para el componente React
   */
  hostApi: PropTypes.shape({
    /** Servicios de navegación */
    navigation: PropTypes.shape({
      labDetails: PropTypes.func,
      addLabTest: PropTypes.func,
      goTo: PropTypes.func
    }),
    /** Servicios de laboratorio */
    labService: PropTypes.shape({
      getLabResults: PropTypes.func,
      downloadReport: PropTypes.func
    }),
    /** Servicios de analytics */
    analytics: PropTypes.shape({
      track: PropTypes.func
    })
  }),
  
  /**
   * Función de traducción del host Angular
   */
  tx: PropTypes.func,
  
  /**
   * Servicio de aplicación de Bahmni
   */
  appService: PropTypes.object
};

// 🔧 Props por defecto
LaboratoryDashboard.defaultProps = {
  hostData: {
    patient: null,
    provider: null,
    activeVisit: null,
    encounter: null
  },
  hostApi: {
    navigation: {},
    labService: {},
    analytics: {}
  },
  tx: (key) => key,
  appService: {}
};

export default LaboratoryDashboard;
```

#### 2.2 Crear Custom Hook para Datos

**Archivo:** `src/laboratory-dashboard/hooks/useLaboratoryData.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { labService } from '../services/labService';

/**
 * Custom hook para gestionar datos de laboratorio
 * 
 * @param {string} patientUuid - UUID del paciente
 * @param {Object} filters - Filtros aplicados
 * @returns {Object} Estado de los datos
 */
export function useLaboratoryData(patientUuid, filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!patientUuid) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const results = await labService.getLabResults(patientUuid, filters);
      setData(results);
    } catch (err) {
      console.error('Error fetching lab data:', err);
      setError(err.message || 'Failed to fetch laboratory data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [patientUuid, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
```

#### 2.3 Crear Servicios API

**Archivo:** `src/laboratory-dashboard/services/labService.js`

```javascript
import axios from 'axios';

/**
 * Servicio para interactuar con APIs de laboratorio
 */
class LabService {
  constructor() {
    this.baseUrl = '/openmrs/ws/rest/v1';
  }

  /**
   * Obtener resultados de laboratorio para un paciente
   * 
   * @param {string} patientUuid - UUID del paciente
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} Lista de resultados
   */
  async getLabResults(patientUuid, filters = {}) {
    try {
      const params = {
        patient: patientUuid,
        v: 'full',
        ...filters
      };

      const response = await axios.get(`${this.baseUrl}/obs`, { params });
      
      if (response.status === 200) {
        return this.transformLabResults(response.data.results || []);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching lab results:', error);
      throw error;
    }
  }

  /**
   * Descargar reporte de laboratorio
   * 
   * @param {string} resultId - ID del resultado
   * @returns {Promise<Blob>} Archivo PDF
   */
  async downloadReport(resultId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/lab/report/${resultId}`,
        { responseType: 'blob' }
      );
      
      return response;
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  /**
   * Transformar datos de OpenMRS a formato del dashboard
   * 
   * @param {Array} rawResults - Datos crudos de OpenMRS
   * @returns {Array} Datos transformados
   */
  transformLabResults(rawResults) {
    return rawResults
      .filter(obs => obs.concept?.conceptClass?.name === 'LabTest')
      .map(obs => ({
        id: obs.uuid,
        testName: obs.concept?.name?.display || 'Unknown Test',
        date: obs.obsDatetime,
        value: obs.value,
        unit: obs.concept?.units || '',
        referenceRange: obs.concept?.referenceRange,
        status: this.determineStatus(obs),
        provider: obs.encounter?.provider || null,
        notes: obs.comment,
        isAbnormal: this.isAbnormal(obs),
        reportAvailable: obs.encounter?.obs?.some(o => 
          o.concept?.name?.display === 'Lab Report'
        )
      }));
  }

  /**
   * Determinar estado del resultado
   * 
   * @param {Object} obs - Observación de OpenMRS
   * @returns {string} Estado
   */
  determineStatus(obs) {
    if (obs.value === null || obs.value === undefined) {
      return 'pending';
    }
    return 'completed';
  }

  /**
   * Determinar si el resultado es anormal
   * 
   * @param {Object} obs - Observación de OpenMRS
   * @returns {boolean} Es anormal
   */
  isAbnormal(obs) {
    // Lógica simplificada - en producción sería más compleja
    const { value, concept } = obs;
    if (!value || !concept?.referenceRange) return false;
    
    // Parse reference range (ej: "10-20")
    const range = concept.referenceRange.split('-');
    if (range.length === 2) {
      const min = parseFloat(range[0]);
      const max = parseFloat(range[1]);
      const numValue = parseFloat(value);
      
      return numValue < min || numValue > max;
    }
    
    return false;
  }
}

export const labService = new LabService();
```

#### 2.4 Crear Utilidades

**Archivo:** `src/laboratory-dashboard/utils/formatters.js`

```javascript
/**
 * Formatear resultado de laboratorio
 * 
 * @param {any} value - Valor del resultado
 * @param {string} unit - Unidad de medida
 * @param {string} referenceRange - Rango de referencia
 * @returns {string} Resultado formateado
 */
export function formatLabResult(value, unit = '', referenceRange = '') {
  if (value === null || value === undefined) {
    return '—';
  }

  let formattedValue = value;
  
  // Formatear números con decimales apropiados
  if (typeof value === 'number') {
    formattedValue = value.toFixed(2).replace(/\.?0+$/, '');
  }

  let result = `${formattedValue}`;
  
  if (unit) {
    result += ` ${unit}`;
  }
  
  if (referenceRange) {
    result += ` (Ref: ${referenceRange})`;
  }
  
  return result;
}

/**
 * Formatear fecha para display
 * 
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export function formatDate(date) {
  if (!date) return '—';
  
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return '—';
  }
}

/**
 * Formatear estado del laboratorio
 * 
 * @param {string} status - Estado del laboratorio
 * @returns {string} Estado formateado
 */
export function formatLabStatus(status) {
  const statusMap = {
    'pending': 'Pendiente',
    'completed': 'Completado',
    'cancelled': 'Cancelado',
    'in_progress': 'En Progreso'
  };
  
  return statusMap[status] || status;
}
```

**Archivo:** `src/laboratory-dashboard/utils/validators.js`

```javascript
/**
 * Validar datos de test de laboratorio
 * 
 * @param {Object} testData - Datos del test
 * @returns {Object} Resultado de validación
 */
export function validateLabTest(testData) {
  const errors = [];
  
  if (!testData.testName || testData.testName.trim().length === 0) {
    errors.push('Test name is required');
  }
  
  if (!testData.patientUuid) {
    errors.push('Patient UUID is required');
  }
  
  if (testData.value !== null && testData.value !== undefined) {
    if (typeof testData.value === 'string' && testData.value.trim().length === 0) {
      errors.push('Result value cannot be empty');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validar rango de referencia
 * 
 * @param {string} referenceRange - Rango de referencia
 * @returns {boolean} Es válido
 */
export function validateReferenceRange(referenceRange) {
  if (!referenceRange) return true; // Optional field
  
  // Formato: "10-20" o "< 5" o "> 100"
  const patterns = [
    /^\d+(\.\d+)?-\d+(\.\d+)?$/, // Range: 10-20
    /^[<>]\s*\d+(\.\d+)?$/, // Comparison: < 5, > 100
    /^[≤≥]\s*\d+(\.\d+)?$/ // Unicode comparison: ≤ 5, ≥ 100
  ];
  
  return patterns.some(pattern => pattern.test(referenceRange.trim()));
}
```

---

## 📝 Paso 3: Crear Estilos

**Archivo:** `src/laboratory-dashboard/laboratory-dashboard.scss`

```scss
// 🎨 Laboratory Dashboard Styles
// Siguiendo las convenciones de Carbon Design System

.laboratory-dashboard {
  padding: 1rem;
  background-color: var(--cds-ui-background);
  min-height: 400px;

  // 📊 Header Section
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--cds-ui-03);

    .lab-header-info {
      flex: 1;

      .section-title-next-ui {
        margin: 0 0 0.5rem 0;
        color: var(--cds-text-01);
        font-size: 1.5rem;
        font-weight: 600;
      }

      .lab-patient-info {
        margin: 0;
        color: var(--cds-text-02);
        font-size: 0.875rem;

        .lab-visit-info {
          margin-left: 0.5rem;
          color: var(--cds-text-03);
        }
      }
    }

    .lab-header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
  }

  // 📈 Statistics Grid
  .lab-stats-grid {
    margin-bottom: 2rem;

    .lab-stat-tile {
      text-align: center;
      padding: 1.5rem 1rem;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      .lab-stat-number {
        font-size: 2rem;
        font-weight: 700;
        color: var(--cds-interactive-01);
        margin-bottom: 0.5rem;
      }

      .lab-stat-label {
        font-size: 0.75rem;
        color: var(--cds-text-02);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }
    }
  }

  // 📋 Content Section
  &__content {
    .lab-results-table {
      background: var(--cds-ui-01);
      border-radius: 4px;
      
      // Personalización de tabla Carbon
      .bx--data-table {
        background: transparent;

        .bx--table-header-label {
          font-weight: 600;
          color: var(--cds-text-01);
        }

        .bx--data-table td {
          border-bottom: 1px solid var(--cds-ui-03);
          vertical-align: middle;
        }

        .bx--data-table tr:hover {
          background-color: var(--cds-hover-ui);
        }
      }
    }
  }

  // 🚫 Empty State
  &__empty {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
    background: var(--cds-ui-01);
    border-radius: 4px;
    border: 2px dashed var(--cds-ui-03);

    .empty-state {
      text-align: center;
      max-width: 400px;
      padding: 2rem;

      .empty-state-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem;
        color: var(--cds-icon-02);
      }

      h3 {
        margin: 0 0 0.5rem 0;
        color: var(--cds-text-01);
        font-size: 1.25rem;
        font-weight: 600;
      }

      p {
        margin: 0 0 1.5rem 0;
        color: var(--cds-text-02);
        line-height: 1.4;
      }
    }
  }

  // ⚡ Loading State
  &--loading {
    .laboratory-dashboard__header {
      .lab-title-skeleton {
        width: 300px;
        height: 2rem;
        margin-bottom: 0.5rem;
      }

      .lab-button-skeleton {
        width: 120px;
        height: 2.5rem;
      }
    }
  }

  // 🚨 Error State
  &--error {
    .bx--inline-notification {
      margin-bottom: 1rem;
    }
  }
}

// 🏷️ Lab Status Badges
.lab-status {
  padding: 0.25rem 0.5rem;
  border-radius: 2px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &--pending {
    background-color: var(--cds-support-03);
    color: var(--cds-inverse-01);
  }

  &--completed {
    background-color: var(--cds-support-02);
    color: var(--cds-inverse-01);
  }

  &--cancelled {
    background-color: var(--cds-support-01);
    color: var(--cds-inverse-01);
  }

  &--in_progress {
    background-color: var(--cds-support-04);
    color: var(--cds-inverse-01);
  }
}

// 🔧 Lab Actions
.lab-actions {
  display: flex;
  gap: 0.25rem;
  
  .bx--btn {
    min-width: auto;
    padding: 0.375rem 0.75rem;
  }
}

// 🔍 Detail Modal
.lab-detail-content {
  .detail-section {
    margin-bottom: 2rem;

    h4 {
      margin: 0 0 1rem 0;
      color: var(--cds-text-01);
      font-size: 1rem;
      font-weight: 600;
      border-bottom: 1px solid var(--cds-ui-03);
      padding-bottom: 0.5rem;
    }

    .detail-list {
      margin: 0;
      
      dt {
        color: var(--cds-text-02);
        font-size: 0.875rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
      }

      dd {
        color: var(--cds-text-01);
        font-size: 0.875rem;
        margin: 0 0 1rem 0;
        padding-left: 0;
      }
    }
  }
}

// 📱 Responsive Design
@media (max-width: 1056px) {
  .laboratory-dashboard {
    padding: 0.5rem;

    &__header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;

      .lab-header-actions {
        justify-content: flex-end;
      }
    }

    .lab-stats-grid {
      .bx--col {
        margin-bottom: 1rem;
      }
    }
  }
}

@media (max-width: 672px) {
  .laboratory-dashboard {
    .lab-actions {
      flex-direction: column;
      gap: 0.5rem;
      
      .bx--btn {
        width: 100%;
        justify-content: center;
      }
    }

    .lab-stats-grid {
      .lab-stat-tile {
        padding: 1rem;
        
        .lab-stat-number {
          font-size: 1.5rem;
        }
      }
    }
  }
}

// 🌙 Dark Theme Support
[data-carbon-theme="g100"] .laboratory-dashboard {
  background-color: var(--cds-ui-background);

  .lab-stat-tile {
    background-color: var(--cds-ui-01);
    border: 1px solid var(--cds-ui-03);
  }

  &__empty {
    background-color: var(--cds-ui-01);
    border-color: var(--cds-ui-03);
  }
}

// 🎨 High Contrast Support
@media (prefers-contrast: high) {
  .laboratory-dashboard {
    .lab-status {
      border: 2px solid currentColor;
      font-weight: 700;
    }

    .lab-stat-tile {
      border: 2px solid var(--cds-ui-03);
    }
  }
}

// ⚡ Reduced Motion Support
@media (prefers-reduced-motion: reduce) {
  .laboratory-dashboard {
    .lab-stat-tile {
      transition: none;

      &:hover {
        transform: none;
      }
    }
  }
}

// 🔤 Print Styles
@media print {
  .laboratory-dashboard {
    background: white !important;
    color: black !important;

    &__header {
      .lab-header-actions {
        display: none;
      }
    }

    .lab-actions {
      display: none;
    }

    .lab-stats-grid {
      break-inside: avoid;
    }
  }
}
```

---

Continuaré con el resto de la documentación completa. ¿Te parece bien el nivel de detalle y calidad hasta aquí? ¿Quieres que continúe con las siguientes secciones?
