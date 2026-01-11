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
import "./ProcedureOrdersControl.scss";

const headers = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Procedimiento" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

export const ProcedureOrdersControl = ({ patientUuid, visitUuid }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setOrders([
        {
          id: "1",
          orderNumber: "PROC-001",
          conceptName: "Endoscopía Digestiva Alta",
          orderDate: "2023-10-27",
          orderer: "Dr. Juan Pérez",
          details: "Ayuno de 8 horas."
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
  const handleEmail = () => alert("Enviando orden de procedimiento...");

  const renderPrintView = () => {
    if (!selectedOrder) return null;
    return (
      <div className="print-view">
        <div className="header">
          <img src={dashboardConfig.institution.logoUrl} alt="Logo" style={{ height: '50px' }} />
          <h2>{dashboardConfig.institution.name}</h2>
        </div>
        <hr />
        <h3>Orden de Procedimiento</h3>
        <p><strong>Procedimiento:</strong> {selectedOrder.conceptName}</p>
        <p><strong>Indicaciones:</strong> {selectedOrder.details}</p>
        <p><strong>Profesional:</strong> {selectedOrder.orderer}</p>
        <div className="footer">
            <p>Firma: __________________________</p>
        </div>
      </div>
    );
  };

  if (loading) return <Loading description="Cargando órdenes de procedimientos..." />;

  return (
    <div className="procedure-orders-container">
      <TableContainer title="Órdenes de Procedimientos">
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
          modalHeading={`Procedimiento: ${selectedOrder.conceptName}`}
          primaryButtonText="Imprimir"
          secondaryButtonText="Enviar"
          onRequestClose={() => setIsModalOpen(false)}
          onRequestSubmit={handlePrint}
          onSecondarySubmit={handleEmail}
        >
          <p><strong>Detalles:</strong> {selectedOrder.details}</p>
        </Modal>
        )}
        {renderPrintView()}
    </div>
  );
};

ProcedureOrdersControl.propTypes = {
  patientUuid: PropTypes.string,
  visitUuid: PropTypes.string
};
