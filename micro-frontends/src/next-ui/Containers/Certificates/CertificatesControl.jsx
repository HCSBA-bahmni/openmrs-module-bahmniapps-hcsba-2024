import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
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
  Modal
} from "carbon-components-react";
import { View16 } from "@carbon/icons-react";
import { dashboardConfig } from "../../config/dashboardConfig";
import "./CertificatesControl.scss";

const headers = [
  { key: "id", header: "ID" },
  { key: "type", header: "Tipo de Certificado" },
  { key: "date", header: "Fecha Emisión" },
  { key: "professional", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

export const CertificatesControl = ({ patientUuid, visitUuid }) => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Mock fetch
    setTimeout(() => {
      setCertificates([
        {
          id: "CERT-001",
          type: "Certificado de Asistencia",
          date: "2023-10-27",
          professional: "Dr. Juan Pérez",
          content: "Se certifica que el paciente asistió a control médico el día de la fecha entre las 10:00 y 11:00 horas."
        },
        {
          id: "CERT-002",
          type: "Licencia Médica / Reposo",
          date: "2023-10-27",
          professional: "Dr. Juan Pérez",
          content: "Reposo por 3 días a contar de la fecha. Diagnóstico: Gripe."
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [patientUuid, visitUuid]);

  const handleViewCert = (cert) => {
    setSelectedCert(cert);
    setIsModalOpen(true);
  };

  const handlePrint = () => window.print();
  const handleEmail = () => alert("Enviando certificado...");

  const renderPrintView = () => {
    if (!selectedCert) return null;
    return (
      <div className="print-view">
        <div className="header">
          <img src={dashboardConfig.institution.logoUrl} alt="Logo" style={{ height: '50px' }} />
          <h2>{dashboardConfig.institution.name}</h2>
        </div>
        <hr />
        <h3>{selectedCert.type}</h3>
        <p className="date">Santiago, {selectedCert.date}</p>
        <br/>
        <p className="body">{selectedCert.content}</p>
        <br/><br/>
        <div className="footer">
            <p><strong>{selectedCert.professional}</strong></p>
            <p>Firma: __________________________</p>
        </div>
      </div>
    );
  };

  if (loading) return <Loading description="Cargando certificados..." />;

  return (
    <div className="certificates-container">
      <TableContainer title="Certificados e Informes">
        <DataTable rows={certificates} headers={headers}>
          {({ rows, headers, getHeaderProps, getRowProps }) => (
            <Table>
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
                {rows.map((row) => {
                    const cert = certificates.find(c => c.id === row.id);
                    return (
                    <TableRow {...getRowProps({ row })}>
                        {row.cells.map((cell) => {
                            if (cell.info.header === 'actions') {
                                return (
                                    <TableCell key={cell.id}>
                                        <Button 
                                            kind="ghost" 
                                            size="small" 
                                            renderIcon={View16} 
                                            onClick={() => handleViewCert(cert)}
                                            hasIconOnly
                                            iconDescription="Ver"
                                        />
                                    </TableCell>
                                )
                            }
                            return <TableCell key={cell.id}>{cell.value}</TableCell>
                        })}
                    </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          )}
        </DataTable>
      </TableContainer>
        {selectedCert && (
        <Modal
          open={isModalOpen}
          modalHeading={selectedCert.type}
          primaryButtonText="Imprimir"
          secondaryButtonText="Enviar"
          onRequestClose={() => setIsModalOpen(false)}
          onRequestSubmit={handlePrint}
          onSecondarySubmit={handleEmail}
        >
          <p>{selectedCert.content}</p>
        </Modal>
        )}
        {renderPrintView()}
    </div>
  );
};

CertificatesControl.propTypes = {
  patientUuid: PropTypes.string,
  visitUuid: PropTypes.string
};
