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
import "./ImagingOrdersControl.scss";

const headers = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Estudio" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

export const ImagingOrdersControl = ({ patientUuid, visitUuid }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setOrders([
        {
          id: "1",
          orderNumber: "IMG-001",
          conceptName: "Radiografía de Tórax",
          orderDate: "2023-10-27",
          orderer: "Dr. Juan Pérez",
          details: "Proyección PA y Lateral."
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
  const handleEmail = () => alert("Enviando orden de imagenología...");

  const renderPrintView = () => {
    if (!selectedOrder) return null;
    return (
      <div className="print-view">
        <div className="header">
          <img src={dashboardConfig.institution.logoUrl} alt="Logo" style={{ height: '50px' }} />
          <h2>{dashboardConfig.institution.name}</h2>
        </div>
        <hr />
        <h3>Orden de Imagenología</h3>
        <p><strong>Estudio:</strong> {selectedOrder.conceptName}</p>
        <p><strong>Indicaciones:</strong> {selectedOrder.details}</p>
        <p><strong>Profesional:</strong> {selectedOrder.orderer}</p>
        <div className="footer">
            <p>Firma: __________________________</p>
        </div>
      </div>
    );
  };

  if (loading) return <Loading description="Cargando órdenes de imagenología..." />;

  return (
    <div className="imaging-orders-container">
      <TableContainer title="Órdenes de Imagenología">
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
          modalHeading={`Imagenología: ${selectedOrder.conceptName}`}
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

ImagingOrdersControl.propTypes = {
  patientUuid: PropTypes.string,
  visitUuid: PropTypes.string
};
