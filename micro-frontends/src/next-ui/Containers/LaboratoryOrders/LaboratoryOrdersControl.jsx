import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
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
import { Printer20, Email20, View16 } from "@carbon/icons-react";
import { dashboardConfig } from "../../config/dashboardConfig";
import "./LaboratoryOrdersControl.scss";

const headers = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Examen" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "status", header: "Estado" },
  { key: "actions", header: "Acciones" },
];

export const LaboratoryOrdersControl = ({ patientUuid, visitUuid }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchOrders();
  }, [patientUuid, visitUuid]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // TODO: Reemplazar con la llamada real a la API usando dashboardConfig.endpoints.laboratory
      // const response = await axios.get(dashboardConfig.endpoints.laboratory, { params: { patient: patientUuid, visit: visitUuid } });
      // setOrders(response.data.results);
      
      // Mock data para demostración
      setTimeout(() => {
        setOrders([
          {
            id: "1",
            orderNumber: "ORD-001",
            conceptName: "Hemograma Completo",
            orderDate: "2023-10-27",
            orderer: "Dr. Juan Pérez",
            status: "Completado",
            details: "Resultados dentro de rango normal."
          },
          {
            id: "2",
            orderNumber: "ORD-002",
            conceptName: "Perfil Lipídico",
            orderDate: "2023-10-28",
            orderer: "Dra. Maria Gonzalez",
            status: "Pendiente",
            details: "Muestra en proceso."
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching laboratory orders:", error);
      setLoading(false);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    // Lógica para enviar correo
    alert(`Enviando orden ${selectedOrder.orderNumber} por correo a ${dashboardConfig.institution.email} (simulado)`);
    // Aquí se llamaría a axios.post(dashboardConfig.endpoints.emailService, { ... })
  };

  const renderPrintView = () => {
    if (!selectedOrder) return null;
    return (
      <div className="print-view">
        <div className="header">
          <img src={dashboardConfig.institution.logoUrl} alt="Logo" style={{ height: '50px' }} />
          <h2>{dashboardConfig.institution.name}</h2>
          <p>{dashboardConfig.institution.address}</p>
        </div>
        <hr />
        <h3>Orden de Laboratorio</h3>
        <p><strong>Paciente:</strong> {patientUuid} (Nombre del paciente aquí)</p>
        <p><strong>Profesional:</strong> {selectedOrder.orderer}</p>
        <p><strong>Fecha:</strong> {selectedOrder.orderDate}</p>
        <p><strong>Examen:</strong> {selectedOrder.conceptName}</p>
        <div className="details">
          <h4>Detalles:</h4>
          <p>{selectedOrder.details}</p>
        </div>
        <div className="footer">
            <p>Firma: __________________________</p>
        </div>
      </div>
    );
  };

  if (loading) return <Loading description="Cargando órdenes de laboratorio..." />;

  return (
    <div className="laboratory-orders-container">
      <TableContainer title="Órdenes de Laboratorio">
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
                                            iconDescription="Ver Detalles"
                                            hasIconOnly
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
        <Pagination
            totalItems={orders.length}
            backwardText="Anterior"
            forwardText="Siguiente"
            pageSize={pageSize}
            pageSizes={[5, 10, 20]}
            itemsPerPageText="Items por página"
            onChange={({ page, pageSize }) => {
                setPage(page);
                setPageSize(pageSize);
            }}
        />
      </TableContainer>

      {selectedOrder && (
        <Modal
          open={isModalOpen}
          modalHeading={`Detalle Orden: ${selectedOrder.orderNumber}`}
          primaryButtonText="Imprimir"
          secondaryButtonText="Enviar por Correo"
          onRequestClose={() => setIsModalOpen(false)}
          onRequestSubmit={handlePrint}
          onSecondarySubmit={handleEmail}
          className="order-details-modal"
        >
          <div className="order-details-content">
             <p><strong>Examen:</strong> {selectedOrder.conceptName}</p>
             <p><strong>Fecha:</strong> {selectedOrder.orderDate}</p>
             <p><strong>Profesional:</strong> {selectedOrder.orderer}</p>
             <p><strong>Estado:</strong> {selectedOrder.status}</p>
             <hr/>
             <p><strong>Detalles:</strong></p>
             <p>{selectedOrder.details}</p>
          </div>
        </Modal>
      )}
      
      {renderPrintView()}
    </div>
  );
};

LaboratoryOrdersControl.propTypes = {
  patientUuid: PropTypes.string,
  visitUuid: PropTypes.string
};
