import React, { useState, useEffect, useCallback } from "react";
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
  Tabs,
  Tab,
  TextInput,
  Tag,
  InlineNotification,
  Pagination,
} from "carbon-components-react";
import { Share16, Printer16, View16 } from "@carbon/icons-react";
import { dashboardConfig } from "../../config/dashboardConfig";
import { I18nProvider } from "../../Components/i18n/I18nProvider";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "./AllOrdersDashboard.scss";

// ─── Columnas por tipo de orden ───────────────────────────────────────────────
const LAB_HEADERS = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Examen" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "status", header: "Estado" },
  { key: "actions", header: "Acciones" },
];

const IMAGING_HEADERS = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Estudio" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

const MEDICATION_HEADERS = [
  { key: "orderNumber", header: "N° Receta" },
  { key: "drugName", header: "Medicamento" },
  { key: "dosage", header: "Dosis" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

const PROCEDURE_HEADERS = [
  { key: "orderNumber", header: "N° Orden" },
  { key: "conceptName", header: "Procedimiento" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];

const REFERRAL_HEADERS = [
  { key: "orderNumber", header: "N° Derivación" },
  { key: "conceptName", header: "Especialidad" },
  { key: "orderDate", header: "Fecha" },
  { key: "orderer", header: "Profesional" },
  { key: "actions", header: "Acciones" },
];



// ─── Componente Tabla genérica ─────────────────────────────────────────────────
function OrdersTable({ orders, headers, onView, pageSize, onPageChange, totalItems, currentPage }) {
  if (orders.length === 0) {
    return (
      <div className="all-orders__empty">
        No hay órdenes registradas para este tipo.
      </div>
    );
  }
  return (
    <>
      <DataTable rows={orders} headers={headers}>
        {({ rows, headers: hdrs, getHeaderProps, getRowProps }) => (
          <Table>
            <TableHead>
              <TableRow>
                {hdrs.map((header) => (
                  <TableHeader key={header.key} {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const order = orders.find((o) => o.id === row.id);
                return (
                  <TableRow key={row.id} {...getRowProps({ row })}>
                    {row.cells.map((cell) => {
                      if (cell.info.header === "actions") {
                        return (
                          <TableCell key={cell.id}>
                            <Button
                              kind="ghost"
                              size="small"
                              renderIcon={View16}
                              iconDescription="Ver detalle"
                              hasIconOnly
                              onClick={() => onView(order)}
                            />
                            <Button
                              kind="ghost"
                              size="small"
                              renderIcon={Printer16}
                              iconDescription="Imprimir"
                              hasIconOnly
                              onClick={() => window.print()}
                            />
                          </TableCell>
                        );
                      }
                      return <TableCell key={cell.id}>{cell.value}</TableCell>;
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataTable>
      <Pagination
        totalItems={totalItems}
        pageSize={pageSize}
        pageSizes={[5, 10, 20]}
        page={currentPage}
        backwardText="Anterior"
        forwardText="Siguiente"
        itemsPerPageText="Por página"
        onChange={onPageChange}
      />
    </>
  );
}

OrdersTable.propTypes = {
  orders: PropTypes.array.isRequired,
  headers: PropTypes.array.isRequired,
  onView: PropTypes.func.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  totalItems: PropTypes.number.isRequired,
  currentPage: PropTypes.number.isRequired,
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export function AllOrdersDashboard(props) {
  const { hostData } = props;
  const patient = hostData?.patient;
  const activeVisit = hostData?.activeVisit;
  const provider = hostData?.provider;

  const patientUuid = patient?.uuid;

  // Nombre completo del paciente
  const patientName =
    patient?.person?.display ||
    patient?.display ||
    patient?.name ||
    "Paciente";

  // Email del paciente (buscar en person.attributes)
  const resolvePatientEmail = useCallback(() => {
    const attrs = patient?.person?.attributes || patient?.attributes || [];
    const emailAttr = attrs.find(
      (a) =>
        a?.attributeType?.display?.toLowerCase() === "email" ||
        a?.attributeType?.display?.toLowerCase() === "correo" ||
        a?.display?.toLowerCase().startsWith("email")
    );
    return emailAttr?.value || "";
  }, [patient]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [allOrders, setAllOrders] = useState({
    laboratory: [],
    imaging: [],
    medication: [],
    procedure: [],
    referral: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [patientEmail, setPatientEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // 'success' | 'error' | null
  const [pagination, setPagination] = useState({
    laboratory: { page: 1, pageSize: 5 },
    imaging: { page: 1, pageSize: 5 },
    medication: { page: 1, pageSize: 5 },
    procedure: { page: 1, pageSize: 5 },
    referral: { page: 1, pageSize: 5 },
  });

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const loadAllOrders = useCallback(async () => {
    if (!patientUuid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const credOpts = {
        credentials: "include",
        headers: { Accept: "application/json" },
      };

      // 1. Obtener tipos de orden ────────────────────────────────────────────
      const orderTypesRes = await fetch(
        "/openmrs/ws/rest/v1/ordertype?v=custom:(uuid,display)",
        credOpts
      );
      const orderTypes = orderTypesRes.ok
        ? (await orderTypesRes.json()).results || []
        : [];

      // Matching case-insensitive (por si los nombres difieren ligeramente)
      const typeUuid = (name) => {
        const lower = name.toLowerCase();
        const found = orderTypes.find(
          (t) =>
            t.display?.toLowerCase() === lower ||
            t.display?.toLowerCase().includes(lower.split(" ")[0])
        );
        return found?.uuid;
      };

      console.debug(
        "AllOrdersDashboard – tipos disponibles:",
        orderTypes.map((t) => t.display)
      );

      // 2a. Fetch con bahmnicore/orders (API Bahmni específica) ──────────────
      const fetchBahmniOrders = async (orderTypeUuid) => {
        if (!orderTypeUuid) return [];
        const url =
          `/openmrs/ws/rest/v1/bahmnicore/orders` +
          `?patientUuid=${patientUuid}` +
          `&orderTypeUuid=${orderTypeUuid}` +
          `&numberOfVisits=10` +
          `&includeObs=true`;           // ← bahmnicore requiere true
        const res = await fetch(url, credOpts);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      };

      // 2b. Fallback: endpoint estándar OpenMRS /order ───────────────────────
      const fetchStandardOrders = async (orderTypeUuid) => {
        if (!orderTypeUuid) return [];
        const url =
          `/openmrs/ws/rest/v1/order` +
          `?patient=${patientUuid}` +
          `&orderType=${orderTypeUuid}` +
          `&v=full&limit=100`;
        const res = await fetch(url, credOpts);
        if (!res.ok) return [];
        const data = await res.json();
        return data.results || [];
      };

      // Intenta bahmnicore, si devuelve vacío usa estándar OpenMRS
      const fetchOrders = async (orderTypeUuid) => {
        const bahmni = await fetchBahmniOrders(orderTypeUuid);
        if (bahmni.length > 0) return bahmni;
        return fetchStandardOrders(orderTypeUuid);
      };

      // 3. Drug orders ───────────────────────────────────────────────────────
      const fetchDrugOrders = async () => {
        const url =
          `/openmrs/ws/rest/v1/bahmnicore/drugOrders` +
          `?patientUuid=${patientUuid}` +
          `&numberOfVisits=10` +
          `&includeActiveVisit=true`;
        const res = await fetch(url, credOpts);
        if (!res.ok) return [];
        const data = await res.json();
        if (Array.isArray(data)) return data;
        // prescribedAndActive devuelve objeto { visitDate: [orders], ... }
        return Object.values(data).flat();
      };

      // 4. Ejecutar todo en paralelo ─────────────────────────────────────────
      const [labRaw, imagingRaw, procedureRaw, referralRaw, drugRaw] =
        await Promise.all([
          fetchOrders(typeUuid("Lab Order")),
          fetchOrders(typeUuid("Radiology Order")),
          fetchOrders(typeUuid("Procedure Order")),
          fetchOrders(typeUuid("Referral Order")),
          fetchDrugOrders(),
        ]);

      console.debug("AllOrdersDashboard – resultados raw:", {
        lab: labRaw.length,
        imaging: imagingRaw.length,
        procedure: procedureRaw.length,
        referral: referralRaw.length,
        drugs: drugRaw.length,
      });

      // 5. Mappers – soporta formato bahmnicore Y formato estándar OpenMRS ───
      const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString("es-CL") : "-";

      const extractConceptName = (o) =>
        (typeof o.conceptName === "string" ? o.conceptName : null) ||
        o.concept?.display ||
        (typeof o.concept?.name === "string"
          ? o.concept.name
          : o.concept?.name?.display) ||
        "-";

      const extractOrderer = (o) =>
        (typeof o.provider === "string" ? o.provider : null) ||
        o.orderer?.person?.display ||
        o.orderer?.display ||
        "-";

      const mapOrder = (o, i, type) => ({
        id: o.uuid || `${type}-${i}`,
        orderNumber: o.orderNumber || "-",
        conceptName: extractConceptName(o),
        orderDate: formatDate(o.orderDate || o.dateActivated || o.scheduledDate),
        orderer: extractOrderer(o),
        status: o.urgency || o.action || o.status || "",
        details: "",
        type,
      });

      const mapDrugOrder = (o, i) => {
        const dose = o.dosingInstructions?.dose;
        const units = o.dosingInstructions?.doseUnits?.display || "";
        const freq = o.dosingInstructions?.frequency?.display || "";
        const dur = o.duration
          ? `${o.duration} ${o.durationUnits?.display || ""}`.trim()
          : "";
        const dosage =
          [dose != null && `${dose} ${units}`.trim(), freq, dur]
            .filter(Boolean)
            .join(" – ") || "-";

        return {
          id: o.uuid || `med-${i}`,
          orderNumber: o.orderNumber || "-",
          drugName:
            o.drug?.display || o.drug?.name || o.drugNonCoded || "-",
          dosage,
          orderDate: formatDate(o.dateActivated || o.scheduledDate),
          orderer: extractOrderer(o),
          details:
            o.dosingInstructions?.administrationInstructions || "",
          type: "Medicamento",
        };
      };

      // 6. Actualizar estado ─────────────────────────────────────────────────
      setAllOrders({
        laboratory: labRaw.map((o, i) => mapOrder(o, i, "Laboratorio")),
        imaging: imagingRaw.map((o, i) => mapOrder(o, i, "Imagenología")),
        medication: drugRaw.map((o, i) => mapDrugOrder(o, i)),
        procedure: procedureRaw.map((o, i) => mapOrder(o, i, "Procedimiento")),
        referral: referralRaw.map((o, i) => mapOrder(o, i, "Derivación")),
      });
    } catch (err) {
      console.error("AllOrdersDashboard: error cargando órdenes", err);
      setAllOrders({
        laboratory: [],
        imaging: [],
        medication: [],
        procedure: [],
        referral: [],
      });
    } finally {
      setLoading(false);
    }
  }, [patientUuid]);

  useEffect(() => {
    setPatientEmail(resolvePatientEmail());
    loadAllOrders();
  }, [patientUuid]);

  // ── Conteo total de órdenes ────────────────────────────────────────────────
  const totalOrders =
    allOrders.laboratory.length +
    allOrders.imaging.length +
    allOrders.medication.length +
    allOrders.procedure.length +
    allOrders.referral.length;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handlePaginationChange = (type, { page, pageSize }) => {
    setPagination((prev) => ({ ...prev, [type]: { page, pageSize } }));
  };

  const paginatedOrders = (type) => {
    const { page, pageSize } = pagination[type];
    const start = (page - 1) * pageSize;
    return allOrders[type].slice(start, start + pageSize);
  };


  // ── Generación de PDF con pdfMake v0.1.x (sin borderColor por celda – no soportado en 0.1.x) ─
  const generatePdfBase64 = useCallback(() => {
    return new Promise((resolve, reject) => {
      try {
        const institution = dashboardConfig.institution;
        const today = new Date().toLocaleDateString("es-CL");
        const providerName =
          provider?.person?.display || provider?.display || "";

        // ── Paleta ──────────────────────────────────────────────────────────
        const C_BLUE       = "#1e40af";
        const C_BLUE_LIGHT = "#dbeafe";
        const C_BLUE_BDR   = "#bfdbfe";
        const C_ALT_ROW    = "#f0f5ff";
        const C_GRAY       = "#555555";
        const C_BORDER     = "#d1d5db";

        // A4 content width = 595 - 40 (izq) - 40 (der) = 515 pt
        const LINE_W = 515;

        // ── tableLayouts: pdfMake 0.1.x requiere definir colores de borde
        //    a nivel de layout, NO por celda (borderColor por celda es 0.2.x+)
        const tableLayouts = {
          ordersLayout: {
            hLineWidth: (i) => 0.5,
            vLineWidth: (i) => 0.5,
            hLineColor: (i) => (i === 1 ? C_BLUE_BDR : C_BORDER),
            vLineColor: () => C_BORDER,
            paddingLeft:   () => 3,
            paddingRight:  () => 3,
            paddingTop:    () => 2,
            paddingBottom: () => 2,
          },
          patientLayout: {
            hLineWidth: () => 0.5,
            vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? 0.5 : 0),
            hLineColor: () => C_BLUE_BDR,
            vLineColor: () => C_BLUE_BDR,
            paddingLeft:   () => 5,
            paddingRight:  () => 5,
            paddingTop:    () => 4,
            paddingBottom: () => 4,
          },
        };

        // ── Helper: tabla de órdenes ─────────────────────────────────────────
        const orderTable = (headers, widths, rows) => ({
          layout: "ordersLayout",
          table: {
            headerRows: 1,
            widths,
            body: [
              headers.map((h) => ({
                text: h,
                bold: true,
                fontSize: 8,
                color: "#1e3a5f",
                fillColor: C_BLUE_LIGHT,
              })),
              ...rows.map((cells, i) =>
                cells.map((c) => ({
                  text: String(c || "–"),
                  fontSize: 8,
                  fillColor: i % 2 === 0 ? "#ffffff" : C_ALT_ROW,
                }))
              ),
            ],
          },
          margin: [0, 0, 0, 8],
        });

        const sectionHead = (title, count) => ({
          text: `${title}  (${count})`,
          fontSize: 9.5,
          bold: true,
          color: C_BLUE,
          margin: [0, 8, 0, 3],
        });

        // ── Contenido del documento ─────────────────────────────────────────
        const content = [];

        // Cabecera institucional (2 columnas)
        content.push({
          columns: [
            {
              width: "*",
              stack: [
                { text: institution.name, fontSize: 13, bold: true, color: C_BLUE },
                { text: institution.address, fontSize: 8.5, color: C_GRAY, margin: [0, 2, 0, 0] },
                { text: `${institution.phone}  |  ${institution.email}`, fontSize: 8.5, color: C_GRAY, margin: [0, 1, 0, 0] },
              ],
            },
            {
              width: "auto",
              alignment: "right",
              stack: [
                { text: `Fecha: ${today}`, fontSize: 8.5, color: C_GRAY },
              ],
            },
          ],
          columnGap: 10,
          margin: [0, 0, 0, 6],
        });

        // Línea azul separadora
        content.push({
          canvas: [{ type: "line", x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 2, lineColor: C_BLUE }],
          margin: [0, 0, 0, 8],
        });

        // Título centrado
        content.push({
          text: "RESUMEN DE ÓRDENES MÉDICAS",
          fontSize: 11,
          bold: true,
          alignment: "center",
          color: "#1e3a5f",
          margin: [0, 0, 0, 8],
        });

        // Datos del paciente – sin border/borderColor por celda (usa layout)
        content.push({
          layout: "patientLayout",
          table: {
            widths: ["*", "*"],
            body: [
              [
                {
                  text: [{ text: "Paciente: ", bold: true }, patientName],
                  fontSize: 8.5,
                  fillColor: "#eff6ff",
                },
                {
                  text: [{ text: "Profesional: ", bold: true }, providerName],
                  fontSize: 8.5,
                  fillColor: "#eff6ff",
                },
              ],
              [
                {
                  colSpan: 2,
                  text: [
                    { text: "Visita: ", bold: true },
                    activeVisit
                      ? activeVisit.visitType?.display || activeVisit.uuid
                      : "Sin visita activa",
                  ],
                  fontSize: 8.5,
                  fillColor: "#eff6ff",
                },
                {},
              ],
            ],
          },
          margin: [0, 0, 0, 10],
        });

        // ── Secciones de órdenes ────────────────────────────────────────────
        if (allOrders.laboratory.length > 0) {
          content.push(sectionHead("Órdenes de Laboratorio", allOrders.laboratory.length));
          content.push(orderTable(
            ["N° Orden", "Examen", "Fecha", "Profesional", "Estado"],
            [55, "*", 55, "*", 60],
            allOrders.laboratory.map((o) => [o.orderNumber, o.conceptName, o.orderDate, o.orderer, o.status])
          ));
        }

        if (allOrders.imaging.length > 0) {
          content.push(sectionHead("Órdenes de Imagenología", allOrders.imaging.length));
          content.push(orderTable(
            ["N° Orden", "Estudio", "Fecha", "Profesional"],
            [55, "*", 55, "*"],
            allOrders.imaging.map((o) => [o.orderNumber, o.conceptName, o.orderDate, o.orderer])
          ));
        }

        if (allOrders.medication.length > 0) {
          content.push(sectionHead("Recetas Médicas", allOrders.medication.length));
          content.push(orderTable(
            ["N° Receta", "Medicamento", "Dosis", "Fecha", "Profesional"],
            [55, "*", "*", 55, "*"],
            allOrders.medication.map((o) => [o.orderNumber, o.drugName, o.dosage, o.orderDate, o.orderer])
          ));
        }

        if (allOrders.procedure.length > 0) {
          content.push(sectionHead("Órdenes de Procedimientos", allOrders.procedure.length));
          content.push(orderTable(
            ["N° Orden", "Procedimiento", "Fecha", "Profesional"],
            [55, "*", 55, "*"],
            allOrders.procedure.map((o) => [o.orderNumber, o.conceptName, o.orderDate, o.orderer])
          ));
        }

        if (allOrders.referral.length > 0) {
          content.push(sectionHead("Derivaciones", allOrders.referral.length));
          content.push(orderTable(
            ["N° Derivación", "Especialidad", "Fecha", "Profesional"],
            [62, "*", 55, "*"],
            allOrders.referral.map((o) => [o.orderNumber, o.conceptName, o.orderDate, o.orderer])
          ));
        }

        // Línea de cierre
        content.push({
          canvas: [{ type: "line", x1: 0, y1: 0, x2: LINE_W, y2: 0, lineWidth: 0.5, lineColor: C_BORDER }],
          margin: [0, 16, 0, 8],
        });

        // Pie de página
        content.push({
          columns: [
            {
              width: "*",
              stack: [
                { text: [{ text: "Profesional: ", bold: true }, providerName], fontSize: 8.5 },
                { text: "Firma: _______________________", fontSize: 8.5, margin: [0, 12, 0, 0] },
                { text: "RUT: __________________________", fontSize: 8.5, margin: [0, 4, 0, 0] },
              ],
            },
            {
              width: "auto",
              alignment: "right",
              stack: [
                { text: institution.name, fontSize: 8.5 },
                { text: institution.address, fontSize: 8.5, margin: [0, 2, 0, 0] },
              ],
            },
          ],
          columnGap: 10,
        });

        // ── Generar PDF con pdfMake v0.1.x ──────────────────────────────────
        /* global pdfMake */
        pdfMake
          .createPdf(
            {
              pageSize: "A4",
              pageMargins: [40, 40, 40, 40],
              content,
              defaultStyle: { font: "Roboto" },
            },
            tableLayouts   // 2° arg en v0.1.x para layouts custom
          )
          .getBase64((base64) => resolve(base64));

      } catch (err) {
        reject(err);
      }
    });
  }, [allOrders, patientName, provider, activeVisit]);

  // ── Cuerpo breve del correo (el detalle va en el PDF adjunto) ─────────────
  const buildEmailIntro = () => {
    const today = new Date().toLocaleDateString("es-CL");
    const institution = dashboardConfig.institution;
    const providerName =
      provider?.person?.display || provider?.display || institution.name;
    return [
      `Estimado/a ${patientName},`,
      "",
      `Se adjunta el resumen de sus órdenes médicas emitidas el ${today}.`,
      "",
      `  • Laboratorio:   ${allOrders.laboratory.length}`,
      `  • Imagenología:  ${allOrders.imaging.length}`,
      `  • Medicamentos:  ${allOrders.medication.length}`,
      `  • Procedimientos:${allOrders.procedure.length}`,
      `  • Derivaciones:  ${allOrders.referral.length}`,
      "",
      `Total de órdenes: ${totalOrders}`,
      "",
      "Atentamente,",
      providerName,
      institution.name,
      institution.address,
      institution.phone,
    ].join("\n");
  };

  const handleSendEmail = async () => {
    if (!patientUuid) return;
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const today = new Date().toLocaleDateString("es-CL");
      const subject = `Órdenes médicas – ${patientName} – ${today}`;
      const fileName = `Ordenes_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`;

      // 1. Generar PDF
      const pdfBase64 = await generatePdfBase64();

      // 2. Enviar via API nativa de Bahmni (igual que transmissionService.js)
      const emailUrl = `/openmrs/ws/rest/v1/patient/${patientUuid}/send/email`;

      const response = await fetch(emailUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mailAttachments: [
            {
              contentType: "application/pdf",
              name: fileName,
              data: pdfBase64,
              url: null,
            },
          ],
          subject,
          body: buildEmailIntro(), // ← mensaje breve; el detalle va en el PDF
          cc: [],
          bcc: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.statusLine && data.statusLine.statusCode !== 200) {
        throw new Error(data.statusLine.reasonPhrase || "Error del servidor");
      }

      setEmailStatus("success");
      setTimeout(() => {
        setIsShareModalOpen(false);
        setEmailStatus(null);
      }, 2500);
    } catch (err) {
      console.error("AllOrdersDashboard: error enviando email con PDF", err);
      setEmailStatus("error");
    } finally {
      setEmailSending(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderDetailModal = () => {
    if (!selectedOrder) return null;
    return (
      <Modal
        open={isDetailModalOpen}
        modalHeading={`Detalle: ${selectedOrder.conceptName || selectedOrder.drugName || selectedOrder.orderNumber}`}
        primaryButtonText="Imprimir"
        secondaryButtonText="Cerrar"
        onRequestClose={() => setIsDetailModalOpen(false)}
        onRequestSubmit={() => window.print()}
        onSecondarySubmit={() => setIsDetailModalOpen(false)}
        className="all-orders__detail-modal"
      >
        <div className="all-orders__detail-content">
          <div className="all-orders__detail-row">
            <Tag type="blue" size="sm">{selectedOrder.type}</Tag>
          </div>
          {selectedOrder.orderNumber && (
            <p><strong>N° Orden:</strong> {selectedOrder.orderNumber}</p>
          )}
          {selectedOrder.conceptName && (
            <p><strong>Descripción:</strong> {selectedOrder.conceptName}</p>
          )}
          {selectedOrder.drugName && (
            <p><strong>Medicamento:</strong> {selectedOrder.drugName}</p>
          )}
          {selectedOrder.dosage && (
            <p><strong>Dosis:</strong> {selectedOrder.dosage}</p>
          )}
          {selectedOrder.orderDate && (
            <p><strong>Fecha:</strong> {selectedOrder.orderDate}</p>
          )}
          {selectedOrder.orderer && (
            <p><strong>Profesional:</strong> {selectedOrder.orderer}</p>
          )}
          {selectedOrder.status && (
            <p><strong>Estado:</strong> {selectedOrder.status}</p>
          )}
          {selectedOrder.details && (
            <>
              <hr />
              <p><strong>Indicaciones:</strong></p>
              <p className="all-orders__details-text">{selectedOrder.details}</p>
            </>
          )}
        </div>
      </Modal>
    );
  };

  const renderShareModal = () => (
    <Modal
      open={isShareModalOpen}
      modalHeading="Compartir todas las órdenes por correo"
      primaryButtonText={emailSending ? "Generando PDF y enviando…" : "Enviar correo con PDF"}
      secondaryButtonText="Cancelar"
      primaryButtonDisabled={emailSending || !patientUuid}
      onRequestClose={() => {
        setIsShareModalOpen(false);
        setEmailStatus(null);
      }}
      onRequestSubmit={handleSendEmail}
      onSecondarySubmit={() => {
        setIsShareModalOpen(false);
        setEmailStatus(null);
      }}
      className="all-orders__share-modal"
    >
      <div className="all-orders__share-content">
        <p className="all-orders__share-summary">
          Se enviará un resumen de{" "}
          <strong>{totalOrders} órdenes</strong> del paciente{" "}
          <strong>{patientName}</strong> al correo registrado en el sistema.
        </p>

        <div className="all-orders__share-breakdown">
          {allOrders.laboratory.length > 0 && (
            <Tag type="blue" size="sm">Laboratorio: {allOrders.laboratory.length}</Tag>
          )}
          {allOrders.imaging.length > 0 && (
            <Tag type="teal" size="sm">Imagenología: {allOrders.imaging.length}</Tag>
          )}
          {allOrders.medication.length > 0 && (
            <Tag type="green" size="sm">Medicamentos: {allOrders.medication.length}</Tag>
          )}
          {allOrders.procedure.length > 0 && (
            <Tag type="purple" size="sm">Procedimientos: {allOrders.procedure.length}</Tag>
          )}
          {allOrders.referral.length > 0 && (
            <Tag type="warm-gray" size="sm">Derivaciones: {allOrders.referral.length}</Tag>
          )}
        </div>

        <TextInput
          id="patient-email-input"
          labelText="Correo electrónico registrado del paciente"
          placeholder="(no registrado)"
          value={patientEmail}
          onChange={(e) => setPatientEmail(e.target.value)}
          helperText="El correo se enviará al correo registrado del paciente en Bahmni."
          disabled={emailSending}
        />

        {emailStatus === "success" && (
          <InlineNotification
            kind="success"
            title="¡Correo enviado!"
            subtitle="El PDF con las órdenes fue enviado al correo registrado del paciente."
            hideCloseButton
          />
        )}
        {emailStatus === "error" && (
          <InlineNotification
            kind="error"
            title="Error al enviar"
            subtitle="No se pudo enviar el correo. Verifique que el paciente tiene un email registrado e inténtelo nuevamente."
            hideCloseButton
          />
        )}
      </div>
    </Modal>
  );

  // ── Print view (oculta en pantalla, visible al imprimir) ───────────────────
  const renderPrintView = () => (
    <div className="all-orders__print-view">
      <div className="all-orders__print-header">
        <h2>{dashboardConfig.institution.name}</h2>
        <p>{dashboardConfig.institution.address}</p>
        <hr />
        <h3>Resumen de Órdenes Médicas</h3>
        <p><strong>Paciente:</strong> {patientName}</p>
        <p><strong>Fecha:</strong> {new Date().toLocaleDateString("es-CL")}</p>
      </div>

      {allOrders.laboratory.length > 0 && (
        <div>
          <h4>Laboratorio</h4>
          {allOrders.laboratory.map((o) => (
            <p key={o.id}>• {o.orderNumber} – {o.conceptName} ({o.orderDate}) – {o.orderer}</p>
          ))}
        </div>
      )}
      {allOrders.imaging.length > 0 && (
        <div>
          <h4>Imagenología</h4>
          {allOrders.imaging.map((o) => (
            <p key={o.id}>• {o.orderNumber} – {o.conceptName} ({o.orderDate}) – {o.orderer}</p>
          ))}
        </div>
      )}
      {allOrders.medication.length > 0 && (
        <div>
          <h4>Medicamentos</h4>
          {allOrders.medication.map((o) => (
            <p key={o.id}>• {o.orderNumber} – {o.drugName} – {o.dosage} ({o.orderDate})</p>
          ))}
        </div>
      )}
      {allOrders.procedure.length > 0 && (
        <div>
          <h4>Procedimientos</h4>
          {allOrders.procedure.map((o) => (
            <p key={o.id}>• {o.orderNumber} – {o.conceptName} ({o.orderDate}) – {o.orderer}</p>
          ))}
        </div>
      )}
      {allOrders.referral.length > 0 && (
        <div>
          <h4>Derivaciones</h4>
          {allOrders.referral.map((o) => (
            <p key={o.id}>• {o.orderNumber} – {o.conceptName} ({o.orderDate}) – {o.orderer}</p>
          ))}
        </div>
      )}
      <div className="all-orders__print-footer">
        <p>Profesional: {provider?.person?.display || provider?.display || "_______________"}</p>
        <p>Firma: ___________________________</p>
      </div>
    </div>
  );

  // ── Render principal ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <I18nProvider>
        <div className="all-orders__loading">
          <Loading description="Cargando órdenes del paciente…" withOverlay={false} />
        </div>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <div className="all-orders__container">
        {/* ── Cabecera ── */}
        <div className="all-orders__header">
          <div className="all-orders__header-info">
            <h2 className="all-orders__title">Órdenes del Paciente</h2>
            <p className="all-orders__subtitle">
              {patientName}
              {activeVisit && (
                <span className="all-orders__visit-badge">
                  {" "} · Visita activa: {activeVisit.visitType?.display || activeVisit.uuid}
                </span>
              )}
            </p>
          </div>
          <div className="all-orders__header-actions">
            <Button
              kind="ghost"
              renderIcon={Printer16}
              iconDescription="Imprimir todas"
              hasIconOnly
              onClick={() => window.print()}
              tooltipPosition="left"
            />
            <Button
              kind="primary"
              renderIcon={Share16}
              onClick={() => setIsShareModalOpen(true)}
              disabled={totalOrders === 0}
            >
              Compartir ({totalOrders})
            </Button>
          </div>
        </div>

        {/* ── Estado vacío global ── */}
        {totalOrders === 0 ? (
          <div className="all-orders__global-empty">
            <p className="all-orders__global-empty-icon">📋</p>
            <p className="all-orders__global-empty-title">
              Sin órdenes registradas
            </p>
            <p className="all-orders__global-empty-subtitle">
              No se encontraron órdenes de laboratorio, imagenología, medicamentos,
              procedimientos ni derivaciones para este paciente.
            </p>
          </div>
        ) : (
          /* ── Tabs por tipo de orden ── */
          <Tabs className="all-orders__tabs">
          {/* LABORATORIO */}
          <Tab
            id="tab-laboratory"
            label={`Laboratorio${allOrders.laboratory.length ? ` (${allOrders.laboratory.length})` : ""}`}
          >
            <TableContainer title="Órdenes de Laboratorio" className="all-orders__table-container">
              <OrdersTable
                orders={paginatedOrders("laboratory")}
                headers={LAB_HEADERS}
                onView={handleViewOrder}
                pageSize={pagination.laboratory.pageSize}
                currentPage={pagination.laboratory.page}
                totalItems={allOrders.laboratory.length}
                onPageChange={(p) => handlePaginationChange("laboratory", p)}
              />
            </TableContainer>
          </Tab>

          {/* IMAGENOLOGÍA */}
          <Tab
            id="tab-imaging"
            label={`Imagenología${allOrders.imaging.length ? ` (${allOrders.imaging.length})` : ""}`}
          >
            <TableContainer title="Órdenes de Imagenología" className="all-orders__table-container">
              <OrdersTable
                orders={paginatedOrders("imaging")}
                headers={IMAGING_HEADERS}
                onView={handleViewOrder}
                pageSize={pagination.imaging.pageSize}
                currentPage={pagination.imaging.page}
                totalItems={allOrders.imaging.length}
                onPageChange={(p) => handlePaginationChange("imaging", p)}
              />
            </TableContainer>
          </Tab>

          {/* MEDICAMENTOS */}
          <Tab
            id="tab-medication"
            label={`Medicamentos${allOrders.medication.length ? ` (${allOrders.medication.length})` : ""}`}
          >
            <TableContainer title="Recetas Médicas" className="all-orders__table-container">
              <OrdersTable
                orders={paginatedOrders("medication")}
                headers={MEDICATION_HEADERS}
                onView={handleViewOrder}
                pageSize={pagination.medication.pageSize}
                currentPage={pagination.medication.page}
                totalItems={allOrders.medication.length}
                onPageChange={(p) => handlePaginationChange("medication", p)}
              />
            </TableContainer>
          </Tab>

          {/* PROCEDIMIENTOS */}
          <Tab
            id="tab-procedure"
            label={`Procedimientos${allOrders.procedure.length ? ` (${allOrders.procedure.length})` : ""}`}
          >
            <TableContainer title="Órdenes de Procedimientos" className="all-orders__table-container">
              <OrdersTable
                orders={paginatedOrders("procedure")}
                headers={PROCEDURE_HEADERS}
                onView={handleViewOrder}
                pageSize={pagination.procedure.pageSize}
                currentPage={pagination.procedure.page}
                totalItems={allOrders.procedure.length}
                onPageChange={(p) => handlePaginationChange("procedure", p)}
              />
            </TableContainer>
          </Tab>

          {/* DERIVACIONES */}
          <Tab
            id="tab-referral"
            label={`Derivaciones${allOrders.referral.length ? ` (${allOrders.referral.length})` : ""}`}
          >
            <TableContainer title="Derivaciones" className="all-orders__table-container">
              <OrdersTable
                orders={paginatedOrders("referral")}
                headers={REFERRAL_HEADERS}
                onView={handleViewOrder}
                pageSize={pagination.referral.pageSize}
                currentPage={pagination.referral.page}
                totalItems={allOrders.referral.length}
                onPageChange={(p) => handlePaginationChange("referral", p)}
              />
            </TableContainer>
          </Tab>
        </Tabs>
        )} {/* fin totalOrders === 0 ternario */}

        {/* ── Modales ── */}
        {renderDetailModal()}
        {renderShareModal()}
        {renderPrintView()}
      </div>
    </I18nProvider>
  );
}

AllOrdersDashboard.propTypes = {
  hostData: PropTypes.shape({
    patient: PropTypes.object,
    provider: PropTypes.object,
    activeVisit: PropTypes.object,
  }).isRequired,
  hostApi: PropTypes.shape({
    refresh: PropTypes.func,
  }),
  tx: PropTypes.func,
  appService: PropTypes.object,
};

