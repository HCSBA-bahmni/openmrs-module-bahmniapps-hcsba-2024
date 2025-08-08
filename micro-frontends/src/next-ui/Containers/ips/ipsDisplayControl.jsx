import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "../formDisplayControl/formDisplayControl.scss";
import "./ipsDisplayControl.scss";

import { I18nProvider } from "../../Components/i18n/I18nProvider";
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
    Tile,
    Tag,
    Grid,
    Row,
    Column
} from "carbon-components-react";
import { View16, Download16, DocumentPdf16 } from "@carbon/icons-react";

/** NOTE: for reasons known only to react2angular,
 * any functions passed in as props will be undefined at the start, even ones inside other objects
 * so you need to use the conditional operator like props.hostApi?.callback even though it is a mandatory prop
 */

export function IpsDisplayControl(props) {
    const { hostData, hostApi, tx, appService } = props;
    const { patient, provider, activeVisit } = hostData || {};

    // Estados del componente
    const [isLoading, setIsLoading] = useState(true);
    const [ipsData, setIpsData] = useState({
        vacunas: [],
        alergias: [],
        medicamentos: [],
        diagnosticos: [],
        procedimientos: []
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log("IpsDisplayControl montado");
        buildIpsData();
    }, [patient]);

    const buildIpsData = async () => {
        if (!patient || !patient.uuid) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            console.log("Construyendo datos IPS para paciente:", patient);
            
            // Aquí harías las llamadas a las APIs reales para obtener los datos IPS
            // Por ahora, usamos datos mock para demostración
            const mockIpsData = {
                vacunas: [
                    {
                        id: "1",
                        vacuna: "COVID-19 (Pfizer)",
                        fecha: "2024-01-15",
                        dosis: "1ra dosis",
                        lote: "ABC123",
                        proveedor: "Hospital Central"
                    },
                    {
                        id: "2",
                        vacuna: "Influenza",
                        fecha: "2023-10-10",
                        dosis: "Anual",
                        lote: "FLU456",
                        proveedor: "Centro de Salud"
                    }
                ],
                alergias: [
                    {
                        id: "1",
                        alergeno: "Penicilina",
                        severidad: "Severa",
                        reaccion: "Anafilaxia",
                        fecha: "2023-05-20"
                    },
                    {
                        id: "2",
                        alergeno: "Maní",
                        severidad: "Moderada",
                        reaccion: "Urticaria",
                        fecha: "2022-03-15"
                    }
                ],
                medicamentos: [
                    {
                        id: "1",
                        medicamento: "Metformina 500mg",
                        dosis: "2 veces al día",
                        fechaInicio: "2023-01-10",
                        estado: "Activo"
                    },
                    {
                        id: "2",
                        medicamento: "Losartán 50mg",
                        dosis: "1 vez al día",
                        fechaInicio: "2023-06-05",
                        estado: "Activo"
                    }
                ],
                diagnosticos: [
                    {
                        id: "1",
                        diagnostico: "Diabetes Mellitus Tipo 2",
                        codigo: "E11",
                        fecha: "2023-01-10",
                        estado: "Activo"
                    },
                    {
                        id: "2",
                        diagnostico: "Hipertensión Arterial",
                        codigo: "I10",
                        fecha: "2023-06-05",
                        estado: "Activo"
                    }
                ],
                procedimientos: [
                    {
                        id: "1",
                        procedimiento: "Electrocardiograma",
                        fecha: "2024-01-20",
                        resultado: "Normal",
                        proveedor: "Dr. García"
                    }
                ]
            };

            setIpsData(mockIpsData);
        } catch (err) {
            console.error("Error construyendo datos IPS:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateIPS = () => {
        if (hostApi?.ipsService?.generateDocument) {
            hostApi.ipsService.generateDocument(patient.uuid);
        } else {
            console.log("Generando documento IPS para paciente:", patient?.uuid);
            // Implementar la lógica de generación de IPS
        }
    };

    const handleViewDetails = (section, itemId) => {
        if (hostApi?.navigation?.ipsDetails) {
            hostApi.navigation.ipsDetails(section, itemId);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'severa': return 'red';
            case 'moderada': return 'orange';
            case 'leve': return 'yellow';
            default: return 'gray';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'activo': return 'green';
            case 'inactivo': return 'gray';
            case 'completado': return 'blue';
            default: return 'gray';
        }
    };

    const formsHeading = (
        <FormattedMessage
            id={"DASHBOARD_TITLE_IPS_LAC_KEY"}
            defaultMessage={"IPS LAC Dashboard"}
        />
    );

    const loadingMessage = (
        <FormattedMessage
            id={"LOADING_MESSAGE"}
            defaultMessage={"Loading... Please Wait"}
        />
    );

    if (isLoading) {
        return (
            <I18nProvider>
                <div className="ips-display-control-loading">
                    <Loading description={loadingMessage} />
                </div>
            </I18nProvider>
        );
    }

    if (error) {
        return (
            <I18nProvider>
                <div className="ips-display-control-error">
                    <FormattedMessage
                        id="IPS_ERROR_MESSAGE"
                        defaultMessage="Error loading IPS data: {error}"
                        values={{ error }}
                    />
                </div>
            </I18nProvider>
        );
    }

    return (
        <>
            <I18nProvider>
                <div className="ips-display-control">
                    {/* Header */}
                    <div className="ips-header">
                        <h2 className={"forms-display-control-section-title"}>
                            {formsHeading}
                        </h2>
                        <Button
                            kind="primary"
                            renderIcon={DocumentPdf16}
                            onClick={handleGenerateIPS}
                        >
                            <FormattedMessage
                                id="GENERATE_IPS_DOCUMENT"
                                defaultMessage="Generate IPS Document"
                            />
                        </Button>
                    </div>

                    {/* Patient Information */}
                    <div className="ips-patient-info">
                        <Tile>
                            <h3>
                                <FormattedMessage
                                    id="PATIENT_INFORMATION"
                                    defaultMessage="Patient Information"
                                />
                            </h3>
                            <p><strong>
                                <FormattedMessage id="PATIENT_NAME" defaultMessage="Name" />:
                            </strong> {patient?.display || "Unknown"}</p>
                            <p><strong>
                                <FormattedMessage id="PATIENT_ID" defaultMessage="ID" />:
                            </strong> {patient?.uuid}</p>
                            {activeVisit && (
                                <p><strong>
                                    <FormattedMessage id="ACTIVE_VISIT" defaultMessage="Active Visit" />:
                                </strong> {activeVisit.visitType?.display}</p>
                            )}
                        </Tile>
                    </div>

                    <Grid>
                        {/* Vacunas */}
                        <Row>
                            <Column lg={6} md={6} sm={4}>
                                <div className="ips-section">
                                    <h3>
                                        <FormattedMessage
                                            id="IPS_VACUNAS_TITLE"
                                            defaultMessage="Immunizations"
                                        />
                                    </h3>
                                    {ipsData.vacunas.length === 0 ? (
                                        <p className="empty-message">
                                            <FormattedMessage
                                                id="NO_VACUNAS"
                                                defaultMessage="No immunizations recorded"
                                            />
                                        </p>
                                    ) : (
                                        <div className="items-list">
                                            {ipsData.vacunas.map((vacuna) => (
                                                <Tile key={vacuna.id} className="item-tile">
                                                    <div className="item-header">
                                                        <strong>{vacuna.vacuna}</strong>
                                                        <Button
                                                            kind="ghost"
                                                            size="sm"
                                                            renderIcon={View16}
                                                            onClick={() => handleViewDetails('vacunas', vacuna.id)}
                                                        >
                                                            <FormattedMessage id="VIEW" defaultMessage="View" />
                                                        </Button>
                                                    </div>
                                                    <p>{vacuna.dosis} - {new Date(vacuna.fecha).toLocaleDateString()}</p>
                                                    <p><small>{vacuna.proveedor}</small></p>
                                                </Tile>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Column>

                            {/* Alergias */}
                            <Column lg={6} md={6} sm={4}>
                                <div className="ips-section">
                                    <h3>
                                        <FormattedMessage
                                            id="IPS_ALERGIAS_TITLE"
                                            defaultMessage="Allergies"
                                        />
                                    </h3>
                                    {ipsData.alergias.length === 0 ? (
                                        <p className="empty-message">
                                            <FormattedMessage
                                                id="NO_ALERGIAS"
                                                defaultMessage="No allergies recorded"
                                            />
                                        </p>
                                    ) : (
                                        <div className="items-list">
                                            {ipsData.alergias.map((alergia) => (
                                                <Tile key={alergia.id} className="item-tile">
                                                    <div className="item-header">
                                                        <strong>{alergia.alergeno}</strong>
                                                        <Tag type={getSeverityColor(alergia.severidad)}>
                                                            {alergia.severidad}
                                                        </Tag>
                                                    </div>
                                                    <p>{alergia.reaccion}</p>
                                                    <p><small>{new Date(alergia.fecha).toLocaleDateString()}</small></p>
                                                </Tile>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Column>
                        </Row>

                        {/* Medicamentos */}
                        <Row>
                            <Column lg={6} md={6} sm={4}>
                                <div className="ips-section">
                                    <h3>
                                        <FormattedMessage
                                            id="IPS_MEDICAMENTOS_TITLE"
                                            defaultMessage="Current Medications"
                                        />
                                    </h3>
                                    {ipsData.medicamentos.length === 0 ? (
                                        <p className="empty-message">
                                            <FormattedMessage
                                                id="NO_MEDICAMENTOS"
                                                defaultMessage="No current medications"
                                            />
                                        </p>
                                    ) : (
                                        <div className="items-list">
                                            {ipsData.medicamentos.map((medicamento) => (
                                                <Tile key={medicamento.id} className="item-tile">
                                                    <div className="item-header">
                                                        <strong>{medicamento.medicamento}</strong>
                                                        <Tag type={getStatusColor(medicamento.estado)}>
                                                            {medicamento.estado}
                                                        </Tag>
                                                    </div>
                                                    <p>{medicamento.dosis}</p>
                                                    <p><small>
                                                        <FormattedMessage id="SINCE" defaultMessage="Since" />: {new Date(medicamento.fechaInicio).toLocaleDateString()}
                                                    </small></p>
                                                </Tile>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Column>

                            {/* Diagnósticos */}
                            <Column lg={6} md={6} sm={4}>
                                <div className="ips-section">
                                    <h3>
                                        <FormattedMessage
                                            id="IPS_DIAGNOSTICOS_TITLE"
                                            defaultMessage="Diagnoses"
                                        />
                                    </h3>
                                    {ipsData.diagnosticos.length === 0 ? (
                                        <p className="empty-message">
                                            <FormattedMessage
                                                id="NO_DIAGNOSTICOS"
                                                defaultMessage="No diagnoses recorded"
                                            />
                                        </p>
                                    ) : (
                                        <div className="items-list">
                                            {ipsData.diagnosticos.map((diagnostico) => (
                                                <Tile key={diagnostico.id} className="item-tile">
                                                    <div className="item-header">
                                                        <strong>{diagnostico.diagnostico}</strong>
                                                        <Tag type={getStatusColor(diagnostico.estado)}>
                                                            {diagnostico.estado}
                                                        </Tag>
                                                    </div>
                                                    <p>
                                                        <FormattedMessage id="CODE" defaultMessage="Code" />: {diagnostico.codigo}
                                                    </p>
                                                    <p><small>{new Date(diagnostico.fecha).toLocaleDateString()}</small></p>
                                                </Tile>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Column>
                        </Row>

                        {/* Procedimientos */}
                        <Row>
                            <Column lg={12}>
                                <div className="ips-section">
                                    <h3>
                                        <FormattedMessage
                                            id="IPS_PROCEDIMIENTOS_TITLE"
                                            defaultMessage="Recent Procedures"
                                        />
                                    </h3>
                                    {ipsData.procedimientos.length === 0 ? (
                                        <p className="empty-message">
                                            <FormattedMessage
                                                id="NO_PROCEDIMIENTOS"
                                                defaultMessage="No recent procedures"
                                            />
                                        </p>
                                    ) : (
                                        <DataTable
                                            rows={ipsData.procedimientos.map(proc => ({
                                                id: proc.id,
                                                procedimiento: proc.procedimiento,
                                                fecha: new Date(proc.fecha).toLocaleDateString(),
                                                resultado: proc.resultado,
                                                proveedor: proc.proveedor
                                            }))}
                                            headers={[
                                                { key: "procedimiento", header: tx("PROCEDURE") || "Procedure" },
                                                { key: "fecha", header: tx("DATE") || "Date" },
                                                { key: "resultado", header: tx("RESULT") || "Result" },
                                                { key: "proveedor", header: tx("PROVIDER") || "Provider" }
                                            ]}
                                        >
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
                            </Column>
                        </Row>
                    </Grid>
                </div>
            </I18nProvider>
        </>
    );
}

IpsDisplayControl.propTypes = {
    hostData: PropTypes.shape({
        patient: PropTypes.shape({
            uuid: PropTypes.string.isRequired,
            display: PropTypes.string
        }),
        provider: PropTypes.shape({
            uuid: PropTypes.string,
            display: PropTypes.string
        }),
        activeVisit: PropTypes.shape({
            uuid: PropTypes.string,
            visitType: PropTypes.shape({
                display: PropTypes.string
            })
        })
    }).isRequired,
    hostApi: PropTypes.shape({
        navigation: PropTypes.shape({
            ipsDetails: PropTypes.func
        }),
        ipsService: PropTypes.shape({
            generateDocument: PropTypes.func
        }),
        dataService: PropTypes.shape({
            getImmunizations: PropTypes.func,
            getAllergies: PropTypes.func,
            getCurrentMedications: PropTypes.func,
            getDiagnoses: PropTypes.func,
            getProcedures: PropTypes.func
        })
    }),
    tx: PropTypes.func,
    appService: PropTypes.object
};
