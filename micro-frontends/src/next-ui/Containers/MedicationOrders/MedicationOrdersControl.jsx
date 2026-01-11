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
  Modal,
  Pagination
} from "carbon-components-react";
import { View16 } from "@carbon/icons-react";
import { dashboardConfig } from "../../config/dashboardConfig";
import "./MedicationOrdersControl.scss";

const headers = [
  { key: "orderNumber", header: "N° Receta" },
  { key: "drugName", header: "Medicamento" },
  { key: "dosage", header: "Dosis" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

export const MedicationOrdersControl = ({ patientUuid, visitUuid }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Mock fetch
    setTimeout(() => {
      setOrders([
        {
          id: "1",
          orderNumber: "REC-001",
          drugName: "Paracetamol 500mg",
          dosage: "1 cada 8 horas",
          orderDate: "2023-10-27",
          orderer: "Dr. Juan Pérez",
          details: "Tomar con abundante agua."
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [patientUuid, visitUuid]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handlePrint = () => window.print();
  const handleEmail = () => alert("Enviando receta por correo...");

  const renderPrintView = () => {
    if (!selectedOrder) return null;
    return (
      <div className="print-view">
        <div className="header">
          <img src={dashboardConfig.institution.logoUrl} alt="Logo" style={{ height: '50px' }} />
          <h2>{dashboardConfig.institution.name}</h2>
        </div>
        <hr />
        <h3>Receta Médica</h3>
        <p><strong>Medicamento:</strong> {selectedOrder.drugName}</p>
        <p><strong>Dosis:</strong> {selectedOrder.dosage}</p>
        <p><strong>Indicaciones:</strong> {selectedOrder.details}</p>
        <p><strong>Profesional:</strong> {selectedOrder.orderer}</p>
        <div className="footer">
            <p>Firma: __________________________</p>
        </div>
      </div>
    );
  };

  if (loading) return <Loading description="Cargando recetas..." />;

  return (
    <div className="medication-orders-container">
      <TableContainer title="Recetas Médicas">
        <DataTable rows={orders} headers={headers}>
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
                    const order = orders.find(o => o.id === row.id);
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
                                            onClick={() => handleViewOrder(order)}
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
        {selectedOrder && (
        <Modal
          open={isModalOpen}
          modalHeading={`Receta: ${selectedOrder.drugName}`}
          primaryButtonText="Imprimir"
          secondaryButtonText="Enviar"
          onRequestClose={() => setIsModalOpen(false)}
          onRequestSubmit={handlePrint}
          onSecondarySubmit={handleEmail}
        >
          <p><strong>Dosis:</strong> {selectedOrder.dosage}</p>
          <p><strong>Indicaciones:</strong> {selectedOrder.details}</p>
        </Modal>
        )}
        {renderPrintView()}
    </div>
  );
};

MedicationOrdersControl.propTypes = {
  patientUuid: PropTypes.string,
  visitUuid: PropTypes.string
};
